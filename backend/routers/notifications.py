from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User, Notification
from schemas import NotificationOut
from auth import get_current_user
from routers.users import build_profile

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def build_notification(n: Notification, db: Session, current_user: User) -> dict:
    from_user = db.get(User, n.from_user_id)
    return {
        "id":         n.id,
        "type":       n.type,
        "read":       n.read,
        "created_at": n.created_at,
        "from_user":  build_profile(from_user, db, current_user),
    }


@router.get("/", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )
    return [build_notification(n, db, current_user) for n in notifs]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).count()
    return {"count": count}


@router.patch("/read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).update({"read": True})
    db.commit()
    return {"ok": True}
