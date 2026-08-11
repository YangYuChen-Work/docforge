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
            f"{request.chapter_title}\n\n"
            f"根据来源资料，{request.chapter_title}的相关内容如下：\n"
            "（本内容来自本地验证结果，仅用于流程核对，请结合引用资料确认。没有来源依据的内容请标记为待补充。）"
        )

        tables = [
            TableData(
                caption=f"{request.chapter_title}待补充数据",
                headers=["序号", "待补充字段", "待补充字段"],
                rows=[
                    ["1", "待补充", "待补充"],
                    ["2", "待补充", "待补充"],
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
            "polish": f"【润色结果】{selection[:50]}（本地验证内容，请结合来源资料核对。）",
            "expand": f"【扩写结果】{selection[:50]}\n\n本地验证补充段落，请结合来源资料核对。",
            "summarize": f"【摘要结果】{selection[:80]}\n\n本地验证已提炼本段核心信息。",
            "shorten": f"【精简结果】{selection[:80]}（本地验证内容）",
            "extract_points": "【要点结果】\n• 核心目标与适用范围\n• 关键约束与待确认信息\n• 后续执行建议",
            "review": "【审核结果】内容基本符合要求，建议补充具体数据来源。",
            "address_comments": f"【修改结果】已根据批注调整：{instruction[:50]}",
            "generate_diagram": (
                "graph TD\n"
                "  A[产品概述] --> B[市场分析]\n"
                "  B --> C[技术可行性]\n"
                "  C --> D[立项决策]"
            ),
        }
        return action_map.get(action, f"【本地验证操作结果】{action}")
