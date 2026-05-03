from sqlalchemy import Boolean, Column, Integer, String, DateTime, func
from database import Base


class Tarefa(Base):
    __tablename__ = "tarefas"

    id        = Column(Integer, primary_key=True, index=True)
    titulo    = Column(String(100), nullable=False)
    descricao = Column(String(500), nullable=True)
    concluida = Column(Boolean, default=False)
    criada_em = Column(DateTime, server_default=func.now())
