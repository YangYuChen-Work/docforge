import json


def compute_match_status(chapter: dict, matched_sources: list[dict]) -> str:
    """
    chapter: {material_types: "市场调研报告,技术调研报告", keywords: ..., title: ...}
    matched_sources: [{id, original_name, content_texts: [...]}]
    Returns: matched / partial / unmatched
    """
    if not matched_sources:
        return "unmatched"

    required_types = [
        t.strip()
        for t in (chapter.get("material_types") or "").split(",")
        if t.strip()
    ]
    if not required_types:
        return "matched"

    matched_types = set()
    for src in matched_sources:
        for rt in required_types:
            if rt.lower() in src["original_name"].lower():
                matched_types.add(rt)

    if len(matched_types) == 0:
        return "unmatched"
    if len(matched_types) < len(required_types):
        return "partial"
    return "matched"


def extract_relevant_excerpts(
    chapter_title: str,
    sources: list[dict],
    max_chars: int = 3000,
) -> list[dict]:
    """Extract relevant text excerpts from sources for the given chapter title."""
    keywords = [
        kw.strip()
        for kw in chapter_title.replace("（", " ").replace("）", " ").replace("/", " ").split()
        if len(kw.strip()) >= 2
    ]
    results = []
    total_chars = 0

    for src in sources:
        for text in src.get("content_texts", []):
            if not text or len(text) < 4:
                continue
            relevance = sum(1 for kw in keywords if kw in text)
            if relevance > 0 and total_chars < max_chars:
                excerpt = text[:500]
                results.append({
                    "source_id": src["id"],
                    "source_name": src["original_name"],
                    "excerpt": excerpt,
                    "relevance": relevance,
                })
                total_chars += len(excerpt)

    results.sort(key=lambda x: -x["relevance"])
    return results[:10]
