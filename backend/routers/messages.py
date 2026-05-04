from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import User, Follow, Conversation, Message, Notification
from schemas import MessageIn, MessageOut, ConversationOut
from auth import get_current_user
from routers.users import build_profile

router = APIRouter(prefix="/messages", tags=["Messages"])


def get_conv_or_404(conv_id: int, user_id: int, db: Session) -> Conversation:
    conv = db.get(Conversation, conv_id)
    if not conv or (conv.user1_id != user_id and conv.user2_id != user_id):
        raise HTTPException(status_code=404, detail="Conversa nao encontrada")
    return conv


def build_conversation(conv: Conversation, current_user: User, db: Session) -> dict:
    other_id   = conv.user2_id if conv.user1_id == current_user.id else conv.user1_id
    other_user = db.get(User, other_id)

    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .first()
    )
    unread = (
        db.query(Message)
        .filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user.id,
            Message.read == False,
        )
        .count()
    )
    return {
        "id":              conv.id,
        "other_user":      build_profile(other_user, db, current_user),
        "last_message":    last_msg.content if last_msg else None,
        "last_message_at": last_msg.created_at if last_msg else None,
        "unread_count":    unread,
    }


# ── Listar conversas ──────────────────────────────────
@router.get("/", response_model=list[ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convs = (
        db.query(Conversation)
        .filter(or_(
            Conversation.user1_id == current_user.id,
            Conversation.user2_id == current_user.id,
        ))
        .all()
    )
    result = [build_conversation(c, current_user, db) for c in convs]
    result.sort(key=lambda c: c["last_message_at"] or c["id"], reverse=True)
    return result


# ── Iniciar ou recuperar conversa ─────────────────────
@router.post("/", response_model=ConversationOut, status_code=201)
def start_conversation(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Voce nao pode conversar consigo mesmo")

    follows = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.followed_id == target.id,
    ).first()
    if not follows:
        raise HTTPException(status_code=403, detail="Voce so pode enviar mensagens para pessoas que segue")

    u1, u2 = sorted([current_user.id, target.id])
    conv = db.query(Conversation).filter(
        Conversation.user1_id == u1,
        Conversation.user2_id == u2,
    ).first()

    if not conv:
        conv = Conversation(user1_id=u1, user2_id=u2)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    return build_conversation(conv, current_user, db)


# ── Mensagens de uma conversa ─────────────────────────
@router.get("/{conv_id}", response_model=list[MessageOut])
def get_messages(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_conv_or_404(conv_id, current_user.id, db)
    msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    # marca como lidas
    for m in msgs:
        if m.sender_id != current_user.id and not m.read:
            m.read = True
    db.commit()
    return msgs


# ── Enviar mensagem ───────────────────────────────────
@router.post("/{conv_id}", response_model=MessageOut, status_code=201)
def send_message(
    conv_id: int,
    body: MessageIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = get_conv_or_404(conv_id, current_user.id, db)
    msg = Message(
        conversation_id=conv_id,
        sender_id=current_user.id,
        content=body.content,
    )
    db.add(msg)
    recipient_id = conv.user2_id if conv.user1_id == current_user.id else conv.user1_id
    db.add(Notification(user_id=recipient_id, from_user_id=current_user.id, type="message"))
    db.commit()
    db.refresh(msg)
    return msg
