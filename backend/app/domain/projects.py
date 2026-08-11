from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.models import Project


def list_projects(db: Session) -> list[Project]:
    return db.query(Project).order_by(Project.id).all()


def get_project(db: Session, project_id: str) -> Project:
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "PROJECT_NOT_FOUND", "message": f"项目 {project_id} 不存在"},
        )
    return p
