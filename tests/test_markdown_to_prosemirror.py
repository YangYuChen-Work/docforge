from app.services.markdown_to_prosemirror import parse_markdown_to_prosemirror


def test_h3_heading_parsed_as_heading_not_paragraph():
    nodes = parse_markdown_to_prosemirror("### 1. 臂架系统")
    assert nodes[0]["type"] == "heading"
    assert nodes[0]["attrs"]["level"] == 3
    assert nodes[0]["content"][0]["text"] == "1. 臂架系统"


def test_h1_h2_still_supported():
    nodes = parse_markdown_to_prosemirror("# 标题一\n## 标题二")
    assert nodes[0]["attrs"]["level"] == 1
    assert nodes[1]["attrs"]["level"] == 2


def test_heading_level_capped_at_h3():
    nodes = parse_markdown_to_prosemirror("###### 深层标题")
    assert nodes[0]["attrs"]["level"] == 3


def test_bold_marker_extracted_as_mark():
    nodes = parse_markdown_to_prosemirror("- **卖点**：主臂采用五节U型截面")
    # bulletList > listItem > paragraph > text runs
    item_runs = nodes[0]["content"][0]["content"][0]["content"]
    bold_run = [r for r in item_runs if r.get("text") == "卖点"][0]
    assert {"type": "bold"} in bold_run["marks"]


def test_bullet_list_grouped_into_bulletlist_node():
    text = "- **卖点**：主臂采用五节U型截面\n\n- **优势**：显著提升起重能力"
    nodes = parse_markdown_to_prosemirror(text)
    assert nodes[0]["type"] == "bulletList"
    assert len(nodes[0]["content"]) == 2
    assert nodes[0]["content"][0]["type"] == "listItem"


def test_real_bug_report_sample_1_arm_system_section():
    text = (
        "### 1. 臂架系统\n\n"
        "- **卖点**：主臂采用五节U型截面，全伸臂长提升至58m，最大起重力矩≥3200 kN·m。\n\n"
        "- **优势**：显著提升起重能力与作业范围，满足桥梁架设、风电检修等大臂长、重载工况需求。\n\n"
        "### 2. 液压系统\n\n"
        "- **卖点**：配置负载敏感多路阀，起升微动速度≤0.05 m/s。"
    )
    nodes = parse_markdown_to_prosemirror(text)
    types = [n["type"] for n in nodes]
    # two h3 headings, each followed by its own bullet list
    assert types.count("heading") == 2
    assert types.count("bulletList") == 2
    assert nodes[0]["attrs"]["level"] == 3
    assert nodes[0]["content"][0]["text"] == "1. 臂架系统"


def test_pipe_table_parsed_into_table_node():
    text = (
        "| 序号 | 类别 | 备注 |\n"
        "|------|------|------|\n"
        "| 1 | 臂架系统 | 主臂采用五节U型截面 |\n"
        "| 2 | 液压系统 | 配置负载敏感多路阀 |"
    )
    nodes = parse_markdown_to_prosemirror(text)
    assert len(nodes) == 1
    table = nodes[0]
    assert table["type"] == "table"
    header_row, *data_rows = table["content"]
    assert all(c["type"] == "tableHeader" for c in header_row["content"])
    assert [c["content"][0]["content"][0]["text"] for c in header_row["content"]] == ["序号", "类别", "备注"]
    assert len(data_rows) == 2
    assert data_rows[0]["content"][0]["content"][0]["content"][0]["text"] == "1"


def test_pipe_table_with_em_dash_placeholder_cells():
    text = (
        "**表4 质量问题分析表**\n\n"
        "| 序号 | 质量问题描述 | 严重度 |\n"
        "|------|--------------|--------|\n"
        "| —    | —           | —     |"
    )
    nodes = parse_markdown_to_prosemirror(text)
    assert nodes[0]["type"] == "paragraph"
    assert nodes[1]["type"] == "table"
    data_row = nodes[1]["content"][1]
    assert data_row["content"][0]["content"][0]["content"][0]["text"] == "—"


def test_table_caption_bold_paragraph_before_table():
    text = "**表7 产品功能性能定位表**\n\n| 序号 | 类别 |\n|------|------|\n| 1 | 臂架系统 |"
    nodes = parse_markdown_to_prosemirror(text)
    assert nodes[0]["type"] == "paragraph"
    assert nodes[0]["content"][0]["marks"] == [{"type": "bold"}]
    assert nodes[0]["content"][0]["text"] == "表7 产品功能性能定位表"
    assert nodes[1]["type"] == "table"


def test_missing_placeholder_still_highlighted():
    nodes = parse_markdown_to_prosemirror("【待补充：下一年度销量预测】")
    assert nodes[0]["content"][0]["marks"] == [{"type": "highlight", "attrs": {"color": "#fef3c7"}}]


def test_plain_paragraph_fallback():
    nodes = parse_markdown_to_prosemirror("这是一段普通正文。")
    assert nodes[0]["type"] == "paragraph"
    assert nodes[0]["content"][0]["text"] == "这是一段普通正文。"


def test_empty_content_returns_empty_list():
    assert parse_markdown_to_prosemirror("") == []
    assert parse_markdown_to_prosemirror("   \n  \n") == []
