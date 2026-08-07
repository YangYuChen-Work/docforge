from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from app.db.session import get_db
from app.db.models import AuditLog

router = APIRouter()


@router.get("/audit")
def list_logs(
    action: str | None = None,
    entity_type: str | None = None,
    result: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if result:
        q = q.filter(AuditLog.result == result)
    total = q.count()
    logs = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "logs": [
            {
                "id": l.id,
                "actor": l.actor,
                "action": l.action,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "payload_summary": l.payload_summary,
                "result": l.result,
                "error_message": l.error_message,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/audit/stats")
def audit_stats(db: Session = Depends(get_db)):
    today = date.today().isoformat()
    today_ops = db.query(AuditLog).filter(AuditLog.created_at >= today).count()
    gen_count = db.query(AuditLog).filter(AuditLog.action == "generate").count()
    exceptions = db.query(AuditLog).filter(AuditLog.result == "failed").count()
    return {
        "today_ops": today_ops,
        "generation_count": gen_count,
        "rule_changes": 0,
        "exceptions": exceptions,
    }
