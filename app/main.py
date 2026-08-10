from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.session import SessionLocal, create_tables
from app.api import projects, templates, sources, generation, documents, exports, audit
from app.domain.generation import recover_incomplete_generation_tasks

app = FastAPI(title="项目文档工作台", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_tables()
    db = SessionLocal()
    try:
        recover_incomplete_generation_tasks(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "db": "connected",
        "ai_provider": settings.ai_provider,
    }


app.include_router(projects.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(generation.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
