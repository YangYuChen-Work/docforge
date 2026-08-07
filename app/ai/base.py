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
class ChapterGenerationResult:
    chapter_id: str
    content: str
    citations: list[CitationItem]
    missing_information: list[str]
    conflicts: list[ConflictItem]
    confidence: str  # high / medium / low


class AIProvider(Protocol):
    def generate_chapter(self, request: ChapterGenerationRequest) -> ChapterGenerationResult: ...
    def ai_action(self, action: str, selection: str, instruction: str, context: str) -> str: ...
