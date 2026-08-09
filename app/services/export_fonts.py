"""Font choices shared by document exporters.

LibreOffice uses the font names embedded in generated files.  Keep the
platform-specific CJK choice explicit while retaining a stable Latin family
for mixed-language content.
"""
from dataclasses import dataclass
import platform


DEFAULT_LATIN_FONT = "Arial"
DEFAULT_CJK_FALLBACK = "Noto Sans CJK SC"


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
