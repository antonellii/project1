import re
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


# ── Auth ──────────────────────────────────────────────
class RegisterIn(BaseModel):
    username:     str = Field(min_length=3, max_length=50)
    display_name: str = Field(min_length=1, max_length=100)
    email:        str = Field(min_length=5, max_length=200)
    password:     str = Field(min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("A senha deve conter pelo menos uma letra")
        if not re.search(r"[0-9]", v):
            raise ValueError("A senha deve conter pelo menos um numero")
        if not re.search(r"[!@#$%^&*()\-_=+\[\]{};':\"\\|,.<>/?]", v):
            raise ValueError("A senha deve conter pelo menos um simbolo")
        return v


class LoginIn(BaseModel):
    email:    str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type:   str = "bearer"


# ── User ──────────────────────────────────────────────
class UserOut(BaseModel):
    id:              int
    username:        str
    display_name:    str
    email:           str
    bio:             str | None
    avatar_url:      str | None
    created_at:      datetime

    model_config = {"from_attributes": True}


class UserProfileOut(BaseModel):
    id:              int
    username:        str
    display_name:    str
    bio:             str | None
    avatar_url:      str | None
    created_at:      datetime
    followers_count: int = 0
    following_count: int = 0
    is_following:    bool = False

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    bio:          str | None = Field(default=None, max_length=500)
    avatar_url:   str | None = Field(default=None, max_length=500)


# ── Mensagens ─────────────────────────────────────────
class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id:              int
    conversation_id: int
    sender_id:       int
    content:         str
    read:            bool
    created_at:      datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id:              int
    other_user:      UserProfileOut
    last_message:    str | None = None
    last_message_at: datetime | None = None
    unread_count:    int = 0


# ── Post (estrutura base — implementacao futura) ───────
class PostOut(BaseModel):
    id:         int
    user_id:    int
    image_url:  str | None
    caption:    str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Tarefa ────────────────────────────────────────────
class TarefaCreate(BaseModel):
    titulo:    str = Field(min_length=1, max_length=100)
    descricao: str | None = Field(default=None, max_length=500)


class TarefaUpdate(BaseModel):
    titulo:    str | None = Field(default=None, min_length=1, max_length=100)
    descricao: str | None = Field(default=None, max_length=500)
    concluida: bool | None = None


class TarefaOut(BaseModel):
    id:        int
    titulo:    str
    descricao: str | None
    concluida: bool
    criada_em: datetime

    model_config = {"from_attributes": True}
