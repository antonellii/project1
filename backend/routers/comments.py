from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from models import Post, Comment, User
from auth import get_current_user

router = APIRouter(prefix="/posts", tags=["Comments"])


class CommentIn(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


@router.get("/{post_id}/comments", response_model=list[dict])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post nao encontrado")
    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    result = []
    for c in comments:
        author = db.get(User, c.user_id)
        result.append({
            "id":           c.id,
            "content":      c.content,
            "created_at":   c.created_at.isoformat(),
            "author_name":  author.display_name,
            "author_user":  author.username,
            "author_avatar":author.avatar_url,
        })
    return result


@router.post("/{post_id}/comments", response_model=dict, status_code=201)
def add_comment(
    post_id: int,
    body: CommentIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post nao encontrado")
    comment = Comment(post_id=post_id, user_id=current_user.id, content=body.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id":           comment.id,
        "content":      comment.content,
        "created_at":   comment.created_at.isoformat(),
        "author_name":  current_user.display_name,
        "author_user":  current_user.username,
        "author_avatar":current_user.avatar_url,
    }
