from sqlalchemy.orm import Session
from app.db.models import AuditLog


def log(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    result: str = "success",
    payload_summary: str | None = None,
    error_message: str | None = None,
) -> None:
    db.add(AuditLog(
        actor="local_user",
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        payload_summary=payload_summary,
        result=result,
        error_message=error_message,
    ))
    db.commit()
