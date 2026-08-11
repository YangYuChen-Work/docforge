"""Font choices shared by document exporters.

LibreOffice uses the font names embedded in generated files.  Keep the
platform-specific CJK choice explicit while retaining a stable Latin family
for mixed-language content.
"""
from dataclasses import dataclass
import platform
from pathlib import Path


DEFAULT_LATIN_FONT = "Arial"
DEFAULT_CJK_FALLBACK = "Noto Sans CJK SC"

_MACOS_FONT_SEARCH_ROOTS = (
    Path("/System/Library/Fonts/Supplemental"),
    Path("/System/Library/Fonts"),
    Path("/Library/Fonts"),
    Path("/System/Library/AssetsV2"),
    Path("/System/Library/Assets"),
)


@dataclass(frozen=True)
class ExportFontConfig:
    latin: str
    cjk: str


def get_export_font_config(system_name: str | None = None) -> ExportFontConfig:
    """Return the exporter font configuration for an operating system."""
    system_name = system_name or platform.system()
    cjk_font = {
        "Darwin": "PingFang SC",
        "Windows": "Microsoft YaHei",
        "Linux": DEFAULT_CJK_FALLBACK,
    }.get(system_name, DEFAULT_CJK_FALLBACK)
    return ExportFontConfig(latin=DEFAULT_LATIN_FONT, cjk=cjk_font)


def find_export_font_file(font_name: str, system_name: str | None = None) -> Path | None:
    """Find an installed font file that matches the export CJK family.

    The bundled macOS LibreOffice build uses its own Fontconfig search path,
    which can miss fonts stored in newer macOS ``AssetsV2`` directories.
    Return only a local installed file; exporters never download or install
    fonts.  Other platforms keep their normal LibreOffice font discovery and
    use the existing named-font fallback.
    """
    system_name = system_name or platform.system()
    if system_name != "Darwin":
        return None

    known_names = {
        "PingFang SC": "PingFang.ttc",
        "Heiti SC": "STHeiti Medium.ttc",
        "Songti SC": "Songti.ttc",
    }
    filename = known_names.get(font_name)
    if not filename:
        return None

    for root in _MACOS_FONT_SEARCH_ROOTS:
        candidate = root / filename
        if candidate.is_file():
            return candidate
        if root.is_dir() and root.name in {"Supplemental", "AssetsV2", "Assets"}:
            try:
                candidate = next(root.rglob(filename), None)
            except OSError:
                candidate = None
            if candidate and candidate.is_file():
                return candidate
    return None
