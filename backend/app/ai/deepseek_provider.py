import json
from app.ai.base import (
    AIProvider,
    ChapterGenerationRequest,
    ChapterGenerationResult,
    CitationItem,
    ConflictItem,
    TableData,
)
from app.config import settings


class DeepSeekProvider:
    """OpenAI-compatible provider targeting DeepSeek V4 Pro."""

    def __init__(self):
        self._client_instance = None

    def _client(self):
        if self._client_instance is not None:
            return self._client_instance
        try:
            from openai import OpenAI
        except ImportError as e:
            raise RuntimeError("openai package not installed. Run: pip install openai") from e
        self._client_instance = OpenAI(
            api_key=settings.ai_api_key,
            base_url=settings.ai_base_url or "https://api.deepseek.com",
            timeout=settings.ai_timeout_seconds,
            max_retries=settings.ai_max_retries,
        )
        return self._client_instance

    def generate_chapter(self, request: ChapterGenerationRequest) -> ChapterGenerationResult:
        excerpts_text = "\n\n".join(
            f"[来源: {e['source_name']}]\n{e['excerpt']}"
            for e in request.matched_excerpts
        ) or "（无匹配来源资料）"

        tables_text = ""
        if request.structured_tables:
            tables_text = "\n\n## 结构化表格数据\n" + json.dumps(
                request.structured_tables[:3], ensure_ascii=False, indent=2
            )

        missing_text = ""
        if request.known_missing:
            missing_text = "\n\n## 已知缺失资料\n" + "\n".join(
                f"- {m}" for m in request.known_missing
            )

        system_prompt = (
            "你是专业的产品立项文档撰写助手。根据提供的来源资料生成指定章节内容。\n"
            "输出必须是合法 JSON，包含以下字段：\n"
            '  "content": string  — 章节正文（支持 markdown 标题）\n'
            '  "citations": array  — 每条引用 {source_document_id, locator, quote_or_summary}\n'
            '  "missing_information": array of string  — 缺失或无法确认的信息\n'
            '  "conflicts": array  — 冲突 {description, sources: []}\n'
            '  "confidence": "high"|"medium"|"low"\n'
            '  "tables": array  — 章节涉及的表格数据（如果本章节要求填写表格），每个表格格式为\n'
            '    {"caption": "表X 表格标题", "headers": ["列1", "列2", ...], "rows": [["值1", "值2", ...], ...]}\n'
            "    如果本章节不涉及表格，返回空数组 []\n"
            "规则：\n"
            "- 无来源依据的内容必须标注【待补充】，不得虚构事实\n"
            "- 缺失资料列入 missing_information，不得假设其存在\n"
            "- 引用必须包含 source_document_id（从来源资料 ID 中取）\n"
        )

        user_prompt = (
            f"## 项目信息\n{json.dumps(request.project_info, ensure_ascii=False)}\n\n"
            f"## 章节标题\n{request.chapter_title}\n\n"
            f"## 生成指引\n{request.gen_instruction or '按章节标题和来源资料撰写'}\n\n"
            f"## 来源资料片段\n{excerpts_text}"
            f"{tables_text}"
            f"{missing_text}"
        )
        if request.user_instruction:
            user_prompt += f"\n\n## 用户附加指令\n{request.user_instruction}"

        client = self._client()
        response = client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"DeepSeek returned non-JSON response: {e}\nRaw: {raw[:200]}") from e

        for field in ("content", "citations", "missing_information", "conflicts", "confidence"):
            if field not in data:
                raise ValueError(f"DeepSeek response missing required field: {field}")

        citations = [
            CitationItem(
                source_document_id=c.get("source_document_id", ""),
                locator=c.get("locator"),
                quote_or_summary=c.get("quote_or_summary"),
            )
            for c in data.get("citations", [])
            if c.get("source_document_id")
        ]
        conflicts = [
            ConflictItem(
                description=c.get("description", ""),
                sources=c.get("sources", []),
            )
            for c in data.get("conflicts", [])
        ]
        tables = [
            TableData(
                caption=t.get("caption", ""),
                headers=t.get("headers", []),
                rows=t.get("rows", []),
            )
            for t in data.get("tables", [])
            if t.get("headers")  # 跳过没有表头的脏数据
        ]

        return ChapterGenerationResult(
            chapter_id=request.chapter_id,
            content=data["content"],
            citations=citations,
            missing_information=data.get("missing_information", []),
            conflicts=conflicts,
            confidence=data.get("confidence", "medium"),
            tables=tables,
        )

    def ai_action(self, action: str, selection: str, instruction: str, context: str) -> str:
        action_prompts = {
            "polish": f"请润色以下文字，保持原意，改善表达流畅度：\n\n{selection}",
            "expand": f"请扩写以下内容，补充细节和背景：\n\n{selection}",
            "summarize": f"请将以下内容提炼为一段简洁、准确的摘要，保留关键事实和数字：\n\n{selection}",
            "shorten": f"请精简以下内容，删除重复和冗余表达，保留所有关键事实：\n\n{selection}",
            "extract_points": f"请从以下内容中提取 3-6 条结构化要点，使用中文项目符号列表输出：\n\n{selection}",
            "review": f"请审阅以下内容，指出问题并给出修改建议：\n\n{selection}",
            "address_comments": (
                f"请根据以下批注修改文字：\n批注：{instruction}\n\n原文：{selection}"
            ),
            "generate_diagram": (
                f"请根据以下内容生成 Mermaid 流程图（只返回 mermaid 代码块）：\n\n{selection}"
            ),
        }
        prompt = action_prompts.get(action, f'请对以下内容执行"{action}"操作：\n\n{selection}')
        if context:
            prompt += f"\n\n文档上下文：{context[:500]}"

        client = self._client()
        response = client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {"role": "system", "content": "你是专业文档编辑助手，直接返回处理结果，不加额外解释。"},
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content or ""
