from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, func
from database import Base


class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    username     = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    email        = Column(String(200), unique=True, nullable=False, index=True)
    password_hash= Column(String(200), nullable=False)
    bio          = Column(String(500), nullable=True)
    avatar_url   = Column(String(500), nullable=True)
    created_at   = Column(DateTime, server_default=func.now())


class Post(Base):
    __tablename__ = "posts"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title       = Column(String(200), nullable=False, default="")
    image_url   = Column(String(500), nullable=True)
    caption     = Column(String(2000), nullable=True)
    created_at  = Column(DateTime, server_default=func.now())


class Follow(Base):
    __tablename__ = "follows"

    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    followed_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at  = Column(DateTime, server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    from_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type         = Column(String(20), nullable=False)  # follow | message | post
    read         = Column(Boolean, default=False)
    created_at   = Column(DateTime, server_default=func.now())


class Conversation(Base):
    __tablename__ = "conversations"

    id       = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Message(Base):
    __tablename__ = "messages"

    id              = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content         = Column(String(2000), nullable=False)
    read            = Column(Boolean, default=False)
    created_at      = Column(DateTime, server_default=func.now())


class Tarefa(Base):
    __tablename__ = "tarefas"

    id        = Column(Integer, primary_key=True, index=True)
    titulo    = Column(String(100), nullable=False)
    descricao = Column(String(500), nullable=True)
    concluida = Column(Boolean, default=False)
    criada_em = Column(DateTime, server_default=func.now())
