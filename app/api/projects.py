from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.domain import projects as domain

router = APIRouter()


@router.get("/projects")
def list_projects(db: Session = Depends(get_db)):
    items = domain.list_projects(db)
    return [
        {
            "id": p.id,
            "name": p.name,
            "code": p.code,
            "model": p.model,
            "phase": p.phase,
            "category": p.category,
            "status": p.status,
        }
        for p in items
    ]


@router.get("/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = domain.get_project(db, project_id)
    return {
        "id": p.id,
        "name": p.name,
        "code": p.code,
        "model": p.model,
        "phase": p.phase,
        "category": p.category,
        "status": p.status,
        "created_at": p.created_at.isoformat(),
    }
