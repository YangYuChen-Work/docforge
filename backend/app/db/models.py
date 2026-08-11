from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str] = mapped_column(String(50))
    model: Mapped[str] = mapped_column(String(50))
    phase: Mapped[str] = mapped_column(String(50))
    category: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class DocumentTemplate(Base):
    __tablename__ = "document_templates"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    phase: Mapped[str] = mapped_column(String(50))
    category: Mapped[str] = mapped_column(String(50))
    source_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    version: Mapped[str] = mapped_column(String(20), default="1.0")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    gen_rule: Mapped[str | None] = mapped_column(Text, nullable=True)
    export_format: Mapped[str] = mapped_column(String(50), default="docx")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    chapters: Mapped[list["TemplateChapter"]] = relationship(
        back_populates="template", order_by="TemplateChapter.order_index"
    )


class TemplateChapter(Base):
    __tablename__ = "template_chapters"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    template_id: Mapped[str] = mapped_column(String(20), ForeignKey("document_templates.id"))
    title: Mapped[str] = mapped_column(String(200))
    order_index: Mapped[int] = mapped_column(Integer)
    material_types: Mapped[str | None] = mapped_column(String(500), nullable=True)
    keywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    gen_instruction: Mapped[str | None] = mapped_column(Text, nullable=True)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    template: Mapped["DocumentTemplate"] = relationship(back_populates="chapters")


class SourceDocument(Base):
    __tablename__ = "source_documents"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(20), ForeignKey("projects.id"))
    source_type: Mapped[str] = mapped_column(String(20), default="uploaded")
    original_doc_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    original_name: Mapped[str] = mapped_column(String(500))
    stored_path: Mapped[str] = mapped_column(String(500))
    file_type: Mapped[str] = mapped_column(String(10))
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    sha256: Mapped[str] = mapped_column(String(64))
    parse_status: Mapped[str] = mapped_column(String(20), default="uploaded")
    parse_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_count: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    parsed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ParsedSourceContent(Base):
    __tablename__ = "parsed_source_contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_document_id: Mapped[str] = mapped_column(String(50), ForeignKey("source_documents.id"))
    content_type: Mapped[str] = mapped_column(String(20))
    heading_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    heading_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    structured_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    locator: Mapped[str | None] = mapped_column(String(200), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer)


class GenerationTask(Base):
    __tablename__ = "generation_tasks"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(20), ForeignKey("projects.id"))
    template_id: Mapped[str] = mapped_column(String(20), ForeignKey("document_templates.id"))
    status: Mapped[str] = mapped_column(String(30), default="created")
    requested_by: Mapped[str] = mapped_column(String(100), default="local_user")
    selected_source_ids: Mapped[str] = mapped_column(Text, default="[]")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(20), ForeignKey("projects.id"))
    generation_task_id: Mapped[str] = mapped_column(String(50), ForeignKey("generation_tasks.id"))
    template_id: Mapped[str] = mapped_column(String(20), ForeignKey("document_templates.id"))
    title: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    output_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    chapters: Mapped[list["DocumentChapter"]] = relationship(
        back_populates="document", order_by="DocumentChapter.order_index"
    )


class DocumentChapter(Base):
    __tablename__ = "document_chapters"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(50), ForeignKey("generated_documents.id"))
    template_chapter_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    order_index: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    content_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    plain_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagram_mermaid: Mapped[str | None] = mapped_column(Text, nullable=True)
    missing_information_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    conflict_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    match_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    document: Mapped["GeneratedDocument"] = relationship(back_populates="chapters")


class Citation(Base):
    __tablename__ = "citations"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    chapter_id: Mapped[str] = mapped_column(String(50), ForeignKey("document_chapters.id"))
    source_document_id: Mapped[str] = mapped_column(String(50), ForeignKey("source_documents.id"))
    locator: Mapped[str | None] = mapped_column(String(300), nullable=True)
    source_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    citation_type: Mapped[str] = mapped_column(String(20), default="summary")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(50), ForeignKey("generated_documents.id"))
    chapter_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    version_number: Mapped[int] = mapped_column(Integer)
    change_type: Mapped[str] = mapped_column(String(20))
    content_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_json_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    citations_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(100), default="local_user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor: Mapped[str] = mapped_column(String(100), default="local_user")
    action: Mapped[str] = mapped_column(String(50))
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[str] = mapped_column(String(50))
    payload_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    result: Mapped[str] = mapped_column(String(20))
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class Annotation(Base):
    __tablename__ = "annotations"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    chapter_id: Mapped[str] = mapped_column(String(50), ForeignKey("document_chapters.id"))
    type: Mapped[str] = mapped_column(String(20))
    label: Mapped[str] = mapped_column(String(100))
    target_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    source_doc_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    locator: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_by: Mapped[str] = mapped_column(String(100), default="local_user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class Export(Base):
    __tablename__ = "exports"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(50), ForeignKey("generated_documents.id"))
    format: Mapped[str] = mapped_column(String(10))
    include_comments: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    output_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    has_missing_info: Mapped[bool] = mapped_column(Boolean, default=False)
    validation_report: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
