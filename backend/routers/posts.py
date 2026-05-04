from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from pathlib import Path
import uuid, shutil

from database import get_db
from models import Post, Follow, User
from schemas import PostOut
from auth import get_current_user

router   = APIRouter(prefix="/posts", tags=["Posts"])
POST_DIR = Path(__file__).parent.parent / "uploads" / "posts"
ALLOWED  = {"jpg", "jpeg", "png", "webp", "gif"}


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
    result = []
    for p in posts:
        author = db.get(User, p.user_id)
        result.append({
            "id":           p.id,
            "title":        p.title,
            "image_url":    p.image_url,
            "caption":      p.caption,
            "created_at":   p.created_at.isoformat(),
            "user_id":      p.user_id,
            "author_name":  author.display_name,
            "author_user":  author.username,
            "author_avatar":author.avatar_url,
        })
    return result


@router.post("/", response_model=PostOut, status_code=201)
async def create_post(
    title:   str                  = Form(...),
    caption: Optional[str]        = Form(None),
    file:    Optional[UploadFile] = File(None),
    db:      Session              = Depends(get_db),
    current_user: User            = Depends(get_current_user),
):
    image_url = None
    if file and file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED:
            raise HTTPException(400, "Formato invalido. Use JPG, PNG, WEBP ou GIF.")
        filename = f"{uuid.uuid4()}.{ext}"
        dest = POST_DIR / filename
        with open(dest, "wb") as out:
            shutil.copyfileobj(file.file, out)
        image_url = f"/uploads/posts/{filename}"

    post = Post(user_id=current_user.id, title=title, caption=caption, image_url=image_url)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.patch("/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    title:   Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    db:      Session       = Depends(get_db),
    current_user: User     = Depends(get_current_user),
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
