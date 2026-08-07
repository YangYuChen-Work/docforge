from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class CitationItem:
    source_document_id: str
    locator: str | None = None
    quote_or_summary: str | None = None


@dataclass
class ConflictItem:
    description: str
    sources: list[str] = field(default_factory=list)


@dataclass
class ChapterGenerationRequest:
    chapter_id: str
    chapter_title: str
    gen_instruction: str | None
    project_info: dict
    matched_excerpts: list[dict]
    structured_tables: list[dict]
    user_instruction: str | None = None
    known_missing: list[str] = field(default_factory=list)
    known_conflicts: list[str] = field(default_factory=list)


@dataclass
class TableData:
    caption: str  # 例如 "表1 产品近年销量（台数）走势及预测表"
    headers: list[str]  # 表头行，例如 ["序号", "品牌/型号1", "品牌/型号2", ...]
    rows: list[list[str]]  # 数据行，每行是字符串列表，长度应与headers一致


@dataclass
class ChapterGenerationResult:
    chapter_id: str
    content: str
    citations: list[CitationItem]
    missing_information: list[str]
    conflicts: list[ConflictItem]
    confidence: str  # high / medium / low
    tables: list[TableData] = field(default_factory=list)


class AIProvider(Protocol):
    def generate_chapter(self, request: ChapterGenerationRequest) -> ChapterGenerationResult: ...
    def ai_action(self, action: str, selection: str, instruction: str, context: str) -> str: ...
