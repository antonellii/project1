from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import hello
from routers import tarefas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Project1 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hello.router)
app.include_router(tarefas.router)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
