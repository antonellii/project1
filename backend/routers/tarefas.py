from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Tarefa
from schemas import TarefaCreate, TarefaUpdate, TarefaOut

router = APIRouter(prefix="/tarefas", tags=["Tarefas"])


@router.get("/", response_model=list[TarefaOut])
def listar(db: Session = Depends(get_db)):
    return db.query(Tarefa).order_by(Tarefa.criada_em.desc()).all()


@router.post("/", response_model=TarefaOut, status_code=201)
def criar(dados: TarefaCreate, db: Session = Depends(get_db)):
    tarefa = Tarefa(**dados.model_dump())
    db.add(tarefa)
    db.commit()
    db.refresh(tarefa)
    return tarefa


@router.patch("/{id}", response_model=TarefaOut)
def atualizar(id: int, dados: TarefaUpdate, db: Session = Depends(get_db)):
    tarefa = db.get(Tarefa, id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(tarefa, campo, valor)
    db.commit()
    db.refresh(tarefa)
    return tarefa


@router.delete("/{id}", status_code=204)
def deletar(id: int, db: Session = Depends(get_db)):
    tarefa = db.get(Tarefa, id)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa nao encontrada")
    db.delete(tarefa)
    db.commit()
