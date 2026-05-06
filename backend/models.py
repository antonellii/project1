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
    interests    = Column(String(100), nullable=True)  # "visual,digital,3d"
    created_at   = Column(DateTime, server_default=func.now())


class Post(Base):
    __tablename__ = "posts"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title       = Column(String(200), nullable=False, default="")
    image_url   = Column(String(500), nullable=True)
    caption     = Column(String(2000), nullable=True)
    art_style   = Column(String(20), nullable=True)   # "visual" | "digital" | "3d"
    views       = Column(Integer, nullable=False, default=0, server_default="0")
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


class PostImage(Base):
    __tablename__ = "post_images"

    id        = Column(Integer, primary_key=True, index=True)
    post_id   = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    order     = Column(Integer, nullable=False, default=0)


class Like(Base):
    __tablename__ = "likes"

    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id    = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())


class PostView(Base):
    __tablename__ = "post_views"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)


class Comment(Base):
    __tablename__ = "comments"

    id         = Column(Integer, primary_key=True, index=True)
    post_id    = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content    = Column(String(1000), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Tarefa(Base):
    __tablename__ = "tarefas"

    id        = Column(Integer, primary_key=True, index=True)
    titulo    = Column(String(100), nullable=False)
    descricao = Column(String(500), nullable=True)
    concluida = Column(Boolean, default=False)
    criada_em = Column(DateTime, server_default=func.now())
