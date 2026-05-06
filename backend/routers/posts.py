from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
from pathlib import Path
import uuid, shutil

from database import get_db
from models import Post, Follow, User, Like, Comment, PostView, PostImage
from schemas import PostOut
from auth import get_current_user

router   = APIRouter(prefix="/posts", tags=["Posts"])
POST_DIR = Path(__file__).parent.parent / "uploads" / "posts"
ALLOWED  = {"jpg", "jpeg", "png", "webp", "gif"}
VALID_STYLES = {"visual", "digital", "3d"}


def _post_dict(p: Post, db: Session, current_user_id: int | None = None) -> dict:
    author         = db.get(User, p.user_id)
    likes_count    = db.query(Like).filter(Like.post_id == p.id).count()
    comments_count = db.query(Comment).filter(Comment.post_id == p.id).count()
    liked_by_me    = False
    if current_user_id:
        liked_by_me = db.query(Like).filter(
            Like.post_id == p.id, Like.user_id == current_user_id
        ).first() is not None

    post_imgs = (
        db.query(PostImage)
        .filter(PostImage.post_id == p.id)
        .order_by(PostImage.order)
        .all()
    )
    images = [pi.image_url for pi in post_imgs]
    if not images and p.image_url:
        images = [p.image_url]

    return {
        "id":             p.id,
        "title":          p.title,
        "image_url":      images[0] if images else None,
        "images":         images,
        "caption":        p.caption,
        "art_style":      p.art_style,
        "views":          p.views or 0,
        "likes_count":    likes_count,
        "comments_count": comments_count,
        "liked_by_me":    liked_by_me,
        "created_at":     p.created_at.isoformat(),
        "user_id":        p.user_id,
        "author_name":    author.display_name,
        "author_user":    author.username,
        "author_avatar":  author.avatar_url,
        "is_own_post":    current_user_id == p.user_id if current_user_id else False,
    }


@router.get("/feed", response_model=list[dict])
def get_feed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    followed_ids = [
        f.followed_id for f in
        db.query(Follow).filter(Follow.follower_id == current_user.id).all()
    ]
    if not followed_ids:
        return []
    posts = (
        db.query(Post)
        .filter(Post.user_id.in_(followed_ids))
        .order_by(Post.created_at.desc())
        .limit(50)
        .all()
    )
    return [_post_dict(p, db, current_user.id) for p in posts]


@router.get("/by-interest", response_model=list[dict])
def get_by_interest(
    limit: int = 60,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.interests:
        return []
    styles = [s.strip() for s in current_user.interests.split(",") if s.strip() in VALID_STYLES]
    if not styles:
        return []
    posts = (
        db.query(Post)
        .filter(Post.art_style.in_(styles))
        .order_by(Post.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_post_dict(p, db, current_user.id) for p in posts]


@router.get("/trending", response_model=list[dict])
def get_trending(
    limit: int = 40,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    styles = []
    if current_user.interests:
        styles = [s.strip() for s in current_user.interests.split(",") if s.strip() in VALID_STYLES]
    q = db.query(Post).filter(Post.art_style.isnot(None))
    if styles:
        q = q.filter(Post.art_style.notin_(styles))
    posts = q.order_by(Post.views.desc()).limit(limit).all()
    return [_post_dict(p, db, current_user.id) for p in posts]


@router.post("/{post_id}/view", status_code=204)
def register_view(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post nao encontrado")
    already = db.query(PostView).filter(
        PostView.post_id == post_id, PostView.user_id == current_user.id
    ).first()
    if not already:
        post.views = (post.views or 0) + 1
        db.add(PostView(post_id=post_id, user_id=current_user.id))
        db.commit()


@router.post("/{post_id}/like", response_model=dict)
def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post nao encontrado")
    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        liked = False
    else:
        db.add(Like(post_id=post_id, user_id=current_user.id))
        liked = True
    db.commit()
    count = db.query(Like).filter(Like.post_id == post_id).count()
    return {"liked": liked, "likes_count": count}


@router.post("/", response_model=PostOut, status_code=201)
async def create_post(
    title:     str                   = Form(...),
    caption:   Optional[str]         = Form(None),
    art_style: Optional[str]         = Form(None),
    files:     List[UploadFile]      = File(default=[]),
    db:        Session               = Depends(get_db),
    current_user: User               = Depends(get_current_user),
):
    image_urls = []
    for i, file in enumerate(files):
        if not file or not file.filename:
            continue
        ext = file.filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED:
            continue
        filename = f"{uuid.uuid4()}.{ext}"
        with open(POST_DIR / filename, "wb") as out:
            shutil.copyfileobj(file.file, out)
        image_urls.append((i, f"/uploads/posts/{filename}"))

    first_url = image_urls[0][1] if image_urls else None
    style = art_style if art_style in VALID_STYLES else None

    post = Post(
        user_id=current_user.id, title=title, caption=caption,
        image_url=first_url, art_style=style,
    )
    db.add(post)
    db.flush()

    for order, url in image_urls:
        db.add(PostImage(post_id=post.id, image_url=url, order=order))

    db.commit()
    db.refresh(post)
    return post


@router.patch("/{post_id}", response_model=PostOut)
def update_post(
    post_id:   int,
    title:     Optional[str] = Form(None),
    caption:   Optional[str] = Form(None),
    art_style: Optional[str] = Form(None),
    db:        Session       = Depends(get_db),
    current_user: User       = Depends(get_current_user),
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post nao encontrado")
    if post.user_id != current_user.id:
        raise HTTPException(403, "Sem permissao")
    if title is not None:
        post.title = title
    if caption is not None:
        post.caption = caption or None
    if art_style is not None:
        post.art_style = art_style if art_style in VALID_STYLES else None
    db.commit()
    db.refresh(post)
    return post


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post nao encontrado")
    return post


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post nao encontrado")
    if post.user_id != current_user.id:
        raise HTTPException(403, "Sem permissao")
    db.delete(post)
    db.commit()
