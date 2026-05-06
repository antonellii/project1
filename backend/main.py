from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text, inspect as sa_inspect

from database import engine, Base
from routers import hello, tarefas, auth_router, users, messages, notifications, posts, comments

Base.metadata.create_all(bind=engine)

# Migrations
with engine.connect() as conn:
    tables = sa_inspect(engine).get_table_names()
    if "posts" in tables:
        cols = [c["name"] for c in sa_inspect(engine).get_columns("posts")]
        if "title" not in cols:
            conn.execute(text("ALTER TABLE posts ADD COLUMN title VARCHAR(200) NOT NULL DEFAULT ''"))
            conn.commit()
        if "art_style" not in cols:
            conn.execute(text("ALTER TABLE posts ADD COLUMN art_style VARCHAR(20)"))
            conn.commit()
        if "views" not in cols:
            conn.execute(text("ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0"))
            conn.commit()
    if "users" in tables:
        cols = [c["name"] for c in sa_inspect(engine).get_columns("users")]
        if "interests" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN interests VARCHAR(100)"))
            conn.commit()

app = FastAPI(title="Lunar API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(tarefas.router)
app.include_router(comments.router)
app.include_router(hello.router)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
