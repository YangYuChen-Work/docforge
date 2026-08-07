from app.ai.base import (
    AIProvider,
    ChapterGenerationRequest,
    ChapterGenerationResult,
    CitationItem,
    TableData,
)


class MockAIProvider:
    """Returns fixed deterministic content. Used for keyless dev and automated tests.
    Always walks the full state machine — never fakes success."""

    def generate_chapter(self, request: ChapterGenerationRequest) -> ChapterGenerationResult:
        citations = []
        if request.matched_excerpts:
            src = request.matched_excerpts[0]
            citations.append(
                CitationItem(
                    source_document_id=src["source_id"],
                    locator=None,
                    quote_or_summary=src["excerpt"][:100],
                )
            )

        missing = []
        if not request.matched_excerpts:
            missing.append(f'缺少与“{request.chapter_title}”相关的来源资料')

        content = (
            f"【Mock生成】{request.chapter_title}\n\n"
            f"根据来源资料，{request.chapter_title}的相关内容如下：\n"
            "（此为 Mock 模式生成内容，仅用于流程验证。切换至 AI_PROVIDER=deepseek 可获得真实内容。）"
        )

        tables = [
            TableData(
                caption=f"表（Mock示例）{request.chapter_title}相关数据",
                headers=["序号", "示例列1", "示例列2"],
                rows=[
                    ["1", "示例数据A", "示例数据B"],
                    ["2", "示例数据C", "示例数据D"],
                ],
            )
        ]

        return ChapterGenerationResult(
            chapter_id=request.chapter_id,
            content=content,
            citations=citations,
            missing_information=missing,
            conflicts=[],
            confidence="low",
            tables=tables,
        )

    def ai_action(self, action: str, selection: str, instruction: str, context: str) -> str:
        action_map = {
            "polish": f"【润色结果】{selection[:50]}（Mock 润色内容）",
            "expand": f"【扩写结果】{selection[:50]}\n\nMock 扩写补充段落。",
            "review": "【审核结果】内容基本符合要求，建议补充具体数据来源。",
            "address_comments": f"【修改结果】已根据批注调整：{instruction[:50]}",
            "generate_diagram": (
                "graph TD\n"
                "  A[产品概述] --> B[市场分析]\n"
                "  B --> C[技术可行性]\n"
                "  C --> D[立项决策]"
            ),
        }
        return action_map.get(action, f"【Mock AI 操作结果】{action}")
