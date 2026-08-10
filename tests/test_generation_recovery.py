from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import (
    DocumentChapter,
    GeneratedDocument,
    GenerationTask,
    Project,
)
from app.db.session import Base
from app.domain import generation
from app.domain.generation import recover_incomplete_generation_tasks


def test_recover_incomplete_generation_tasks_resumes_pending_chapters_and_fails_orphans(
    tmp_path, monkeypatch
):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'generation-recovery.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        resumable = GenerationTask(
            id="task-resumable",
            project_id="P1",
            template_id="T1",
            status="generating",
            selected_source_ids="[]",
        )
        document = GeneratedDocument(
            id="doc-resumable",
            project_id="P1",
            generation_task_id=resumable.id,
            template_id="T1",
            title="可恢复文档",
            status="generating",
        )
        db.add_all([
            resumable,
            document,
            DocumentChapter(
                id="chapter-done",
                document_id=document.id,
                title="已完成",
                order_index=1,
                status="needs_material",
            ),
            DocumentChapter(
                id="chapter-pending",
                document_id=document.id,
                title="待完成",
                order_index=2,
                status="pending",
            ),
            GenerationTask(
                id="task-orphan",
                project_id="P1",
                template_id="T1",
                status="generating",
                selected_source_ids="[]",
            ),
        ])
        db.commit()

        scheduled = []
        monkeypatch.setattr(
            "app.domain.generation._schedule_generation",
            lambda task_id, doc_id: scheduled.append((task_id, doc_id)),
        )

        recovered = recover_incomplete_generation_tasks(db)

        assert recovered == 1
        assert scheduled == [("task-resumable", "doc-resumable")]
        assert db.get(GenerationTask, "task-resumable").status == "generating"
        orphan = db.get(GenerationTask, "task-orphan")
        assert orphan.status == "failed"
        assert "文档" in orphan.error_message
    finally:
        db.close()


def test_run_generation_marks_task_failed_when_orchestration_raises(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'generation-orchestration-failure.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        project = Project(
            id="P-FAIL",
            name="失败项目",
            code="FAIL-001",
            model="X",
            phase="方案设计",
            category="起重机",
        )
        task = GenerationTask(
            id="task-orchestration-failure",
            project_id=project.id,
            template_id="T-FAIL",
            status="generating",
            selected_source_ids="[]",
        )
        doc = GeneratedDocument(
            id="doc-orchestration-failure",
            project_id=project.id,
            generation_task_id=task.id,
            template_id=task.template_id,
            title="失败文档",
            status="generating",
        )
        db.add_all([project, task, doc])
        db.commit()

        monkeypatch.setattr(
            "app.services.chapter_generator._load_source_data",
            lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("source load failed")),
        )

        generation._run_generation(db, task, doc)

        assert task.status == "failed"
        assert doc.status == "failed"
        assert "source load failed" in task.error_message
    finally:
        db.close()


def test_finalize_generation_task_marks_all_failed_chapters_as_failed(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'generation-finalize-failure.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        task = GenerationTask(
            id="task-all-failed",
            project_id="P1",
            template_id="T1",
            status="generating",
            selected_source_ids="[]",
        )
        doc = GeneratedDocument(
            id="doc-all-failed",
            project_id="P1",
            generation_task_id=task.id,
            template_id="T1",
            title="全失败文档",
            status="generating",
        )
        db.add_all([
            task,
            doc,
            DocumentChapter(
                id="failed-chapter",
                document_id=doc.id,
                title="失败章节",
                order_index=1,
                status="failed",
            ),
        ])
        db.commit()

        generation._finalize_generation_task(db, task, doc)

        assert task.status == "failed"
        assert doc.status == "failed"
        assert "所有章节" in task.error_message
    finally:
        db.close()
