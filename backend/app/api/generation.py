from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import GenerationTask, GeneratedDocument
from app.domain import generation as domain

router = APIRouter()


@router.post("/generation-tasks")
def create_task(body: dict, db: Session = Depends(get_db)):
    task = domain.create_task(
        db,
        body["project_id"],
        body["template_id"],
        body.get("source_ids", []),
    )
    return {"task_id": task.id, "status": task.status}


@router.post("/generation-tasks/{task_id}/start")
def start_task(task_id: str, db: Session = Depends(get_db)):
    task = domain.start_task(db, task_id)
    doc = db.query(GeneratedDocument).filter(
        GeneratedDocument.generation_task_id == task_id
    ).first()
    return {"status": task.status, "document_id": doc.id if doc else None}


@router.get("/generation-tasks/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(404)
    doc = db.query(GeneratedDocument).filter(
        GeneratedDocument.generation_task_id == task_id
    ).first()
    return {
        "id": task.id,
        "project_id": task.project_id,
        "template_id": task.template_id,
        "status": task.status,
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "finished_at": task.finished_at.isoformat() if task.finished_at else None,
        "error_message": task.error_message,
        "document_id": doc.id if doc else None,
    }
