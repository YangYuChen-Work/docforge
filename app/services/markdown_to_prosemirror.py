"""Convert a constrained markdown subset used by AI-generated chapter content
into ProseMirror JSON nodes that Tiptap can render.

Supports:
  - headings: "#" .. "######" (levels above 3 are capped to level 3, matching
    the app's h1/h2/h3 CSS styling — see ContentPanel.vue)
  - **bold** inline marks
  - "- " / "* " bullet list items, grouped into a single bulletList node
  - GitHub-style "| a | b |" pipe tables with a "|---|---|" separator row
  - the app's own missing-info convention: a line starting with "【" that
    mentions "待补充" / "资料缺失" / "Mock" is rendered as a highlighted paragraph

This replaces the previous line-by-line parser that only recognized a literal
"# " / "## " prefix and otherwise emitted the raw markdown text as an
unformatted paragraph — which is why real AI output containing "### " headings,
"**bold**" markers, bullet lists, and "| ... |" tables rendered as unstyled
plain text instead of proper headings/lists/tables in the editor.
"""
import re

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_BULLET_RE = re.compile(r"^[-*]\s+(.*)$")
_BOLD_RE = re.compile(r"(\*\*[^*]+\*\*)")


def parse_markdown_to_prosemirror(text: str) -> list[dict]:
    if not text or not text.strip():
        return []

    lines = text.split("\n")
    nodes: list[dict] = []
    bullet_items: list[list[dict]] = []
    i = 0
    n = len(lines)

    def flush_bullets():
        nonlocal bullet_items
        if bullet_items:
            nodes.append({
                "type": "bulletList",
                "content": [
                    {"type": "listItem", "content": [{"type": "paragraph", "content": runs}]}
                    for runs in bullet_items
                ],
            })
            bullet_items = []

    while i < n:
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        heading_match = _HEADING_RE.match(line)
        if heading_match:
            flush_bullets()
            level = min(len(heading_match.group(1)), 3)
            heading_text = heading_match.group(2).strip()
            nodes.append({
                "type": "heading",
                "attrs": {"level": level},
                "content": _parse_inline(heading_text),
            })
            i += 1
            continue

        if line.startswith("|") and i + 1 < n and _is_separator_row(lines[i + 1]):
            table_lines = [line]
            i += 2
            while i < n and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            flush_bullets()
            nodes.append(_parse_table(table_lines))
            continue

        bullet_match = _BULLET_RE.match(line)
        if bullet_match:
            bullet_items.append(_parse_inline(bullet_match.group(1)))
            i += 1
            continue

        flush_bullets()
        if line.startswith("【") and ("待补充" in line or "资料缺失" in line or "Mock" in line):
            nodes.append({
                "type": "paragraph",
                "content": [{
                    "type": "text",
                    "marks": [{"type": "highlight", "attrs": {"color": "#fef3c7"}}],
                    "text": line,
                }],
            })
        else:
            nodes.append({"type": "paragraph", "content": _parse_inline(line)})
        i += 1

    flush_bullets()
    return nodes


def _parse_inline(text: str) -> list[dict]:
    if not text:
        return []
    runs = []
    for part in _BOLD_RE.split(text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**") and len(part) > 4:
            runs.append({"type": "text", "marks": [{"type": "bold"}], "text": part[2:-2]})
        else:
            runs.append({"type": "text", "text": part})
    return runs or [{"type": "text", "text": text}]


def _is_separator_row(line: str) -> bool:
    stripped = line.strip()
    if "-" not in stripped:
        return False
    cleaned = stripped.replace("|", "").replace(":", "").replace("-", "").strip()
    return cleaned == ""


def _split_row(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [c.strip() for c in line.split("|")]


def _parse_table(table_lines: list[str]) -> dict:
    header_cells = _split_row(table_lines[0])
    rows = [{
        "type": "tableRow",
        "content": [
            {
                "type": "tableHeader",
                "attrs": {"colspan": 1, "rowspan": 1, "colwidth": None},
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": h}] if h else []}],
            }
            for h in header_cells
        ],
    }]
    for line in table_lines[1:]:
        cells = _split_row(line)
        rows.append({
            "type": "tableRow",
            "content": [
                {
                    "type": "tableCell",
                    "attrs": {"colspan": 1, "rowspan": 1, "colwidth": None},
                    "content": [{"type": "paragraph", "content": [{"type": "text", "text": c}] if c else []}],
                }
                for c in cells
            ],
        })
    return {"type": "table", "content": rows}
