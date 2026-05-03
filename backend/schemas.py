from pydantic import BaseModel, Field
from datetime import datetime


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
