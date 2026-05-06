from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import RegisterIn, LoginIn, TokenOut
from auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenOut, status_code=201)
def register(dados: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == dados.email).first():
        raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado")
    if db.query(User).filter(User.username == dados.username).first():
        raise HTTPException(status_code=409, detail="Este nome de usuário já está em uso")
    if db.query(User).filter(User.display_name == dados.display_name).first():
        raise HTTPException(status_code=409, detail="Este nome de exibição já está em uso")

    valid = {"visual", "digital", "3d"}
    interests_str = ",".join(i for i in dados.interests if i in valid) or None

    user = User(
        username=dados.username,
        display_name=dados.display_name,
        email=dados.email,
        password_hash=hash_password(dados.password),
        interests=interests_str,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_token(user.id)}


@router.post("/login", response_model=TokenOut)
def login(dados: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == dados.email).first()
    if not user or not verify_password(dados.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    return {"access_token": create_token(user.id)}
