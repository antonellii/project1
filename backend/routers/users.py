from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import or_
from sqlalchemy.orm import Session
from pathlib import Path
import uuid, shutil

from database import get_db
from models import User, Post, Follow, Notification
from schemas import UserOut, UserProfileOut, UserUpdate, PostOut
from auth import get_current_user, get_optional_user

router = APIRouter(prefix="/users", tags=["Users"])


def build_profile(user: User, db: Session, current_user: User | None) -> dict:
    followers_count = db.query(Follow).filter(Follow.followed_id == user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user.id).count()
    is_following    = False
    if current_user and current_user.id != user.id:
        is_following = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.followed_id == user.id,
        ).first() is not None
    return {
        "id":              user.id,
        "username":        user.username,
        "display_name":    user.display_name,
        "bio":             user.bio,
        "avatar_url":      user.avatar_url,
        "created_at":      user.created_at,
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following":    is_following,
    }


# ── Perfil próprio ────────────────────────────────────
@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    dados: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(current_user, campo, valor)
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Upload de avatar ──────────────────────────────────
AVATAR_DIR = Path(__file__).parent.parent / "uploads" / "avatars"
ALLOWED    = {"jpg", "jpeg", "png", "webp"}

@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail="Formato invalido. Use JPG, PNG ou WEBP.")
    filename = f"{uuid.uuid4()}.{ext}"
    with open(AVATAR_DIR / filename, "wb") as f:
        shutil.copyfileobj(file.file, f)
    current_user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Busca ─────────────────────────────────────────────
@router.get("/search", response_model=list[UserProfileOut])
def search(
    q: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    query = db.query(User).filter(or_(
        User.username.ilike(f"%{q}%"),
        User.display_name.ilike(f"%{q}%"),
    ))
    if current_user:
        query = query.filter(User.id != current_user.id)
    users = query.limit(20).all()
    return [build_profile(u, db, current_user) for u in users]


# ── Perfil público ────────────────────────────────────
@router.get("/{username}", response_model=UserProfileOut)
def get_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    return build_profile(user, db, current_user)


@router.get("/{username}/posts", response_model=list[PostOut])
def get_user_posts(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    return db.query(Post).filter(Post.user_id == user.id).order_by(Post.created_at.desc()).all()


@router.get("/{username}/followers", response_model=list[UserProfileOut])
def get_followers(
    username: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    followers = (
        db.query(User)
        .join(Follow, Follow.follower_id == User.id)
        .filter(Follow.followed_id == user.id)
        .all()
    )
    return [build_profile(u, db, current_user) for u in followers]


@router.get("/{username}/following", response_model=list[UserProfileOut])
def get_following(
    username: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    following = (
        db.query(User)
        .join(Follow, Follow.followed_id == User.id)
        .filter(Follow.follower_id == user.id)
        .all()
    )
    return [build_profile(u, db, current_user) for u in following]


# ── Seguir / Deixar de seguir ─────────────────────────
@router.post("/{username}/follow", status_code=204)
def follow(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Voce nao pode seguir a si mesmo")
    exists = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.followed_id == user.id,
    ).first()
    if not exists:
        db.add(Follow(follower_id=current_user.id, followed_id=user.id))
        db.add(Notification(user_id=user.id, from_user_id=current_user.id, type="follow"))
        db.commit()


@router.delete("/{username}/follow", status_code=204)
def unfollow(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.followed_id == user.id,
    ).first()
    if follow:
        db.delete(follow)
        db.commit()
