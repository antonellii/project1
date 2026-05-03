from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/hello")
def hello():
    return {
        "mensagem": "Olá do FastAPI!",
        "horario": datetime.now().isoformat(),
        "stack": {"frontend": "Vite + JS", "backend": "Python + FastAPI"},
    }
