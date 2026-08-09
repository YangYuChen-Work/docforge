import os
import platform
import shutil
import subprocess
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from xml.sax.saxutils import escape

from app.config import settings
from app.services.export_fonts import find_export_font_file, get_export_font_config


def convert_to_pdf(docx_path: str) -> str:
    docx = Path(docx_path)
    pdf_path = docx.with_suffix(".pdf")

    lo_bin = settings.libreoffice_path or _find_libreoffice()
    if not lo_bin:
        raise RuntimeError(
            "LibreOffice 未找到。请安装 LibreOffice 或设置 LIBREOFFICE_PATH 环境变量。"
        )

    with _conversion_environment(lo_bin) as (environment, user_installation):
        command = [lo_bin]
        if user_installation:
            command.append(f"-env:UserInstallation={user_installation}")
        command.extend(
            ["--headless", "--convert-to", "pdf", "--outdir", str(docx.parent), str(docx)]
        )
        run_kwargs = {
            "capture_output": True,
            "text": True,
            "timeout": 60,
        }
        if environment is not None:
            run_kwargs["env"] = environment
        result = subprocess.run(command, **run_kwargs)
    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice 转换失败: {result.stderr[:300]}")
    if not pdf_path.exists():
        raise RuntimeError("PDF 文件未生成，请检查 LibreOffice 安装")
    return str(pdf_path)


def _find_libreoffice() -> str | None:
    for name in ("soffice", "libreoffice"):
        path = shutil.which(name)
        if path:
            return path
    mac_path = "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    if Path(mac_path).exists():
        return mac_path
    return None


def _find_cjk_font_file(font_name: str) -> Path | None:
    return find_export_font_file(font_name)


def _find_fontconfig_file(lo_bin: str) -> Path | None:
    """Locate LibreOffice's bundled Fontconfig file when it ships one."""
    lo_path = Path(lo_bin).resolve()
    candidates = [lo_path.parent.parent / "Resources/fontconfig/fonts.conf"]

    # Codex's bundled override is a small wrapper in dependencies/bin.  Walk
    # its nearby runtime root without depending on the app's exact version.
    for parent in (lo_path.parent, *lo_path.parents):
        libreoffice_root = parent / "native/libreoffice-headless/libreoffice"
        if not libreoffice_root.is_dir():
            continue
        try:
            candidates.extend(
                app / "Contents/Resources/fontconfig/fonts.conf"
                for app in libreoffice_root.glob("*.app")
            )
        except OSError:
            continue

    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def _fontconfig_with_font_directory(base_config: Path | None, font_directory: Path) -> str:
    if base_config and base_config.is_file():
        try:
            config = base_config.read_text(encoding="utf-8")
            marker = "<fontconfig>"
            if marker in config:
                return config.replace(
                    marker,
                    f"{marker}\n\t<dir>{escape(str(font_directory))}</dir>",
                    1,
                )
        except (OSError, UnicodeError):
            pass

    # A normal LibreOffice installation may not expose its internal config.
    # Keep a small, self-contained fallback so the CJK font still works while
    # retaining the common system and bundled font directories.
    directories = [font_directory, Path("/System/Library/Fonts"), Path("/Library/Fonts")]
    if base_config:
        directories.append(base_config.parent.parent / "fonts/truetype")
    xml_directories = "\n".join(f"\t<dir>{escape(str(path))}</dir>" for path in directories)
    return (
        '<?xml version="1.0"?>\n'
        "<fontconfig>\n"
        f"{xml_directories}\n"
        '\t<cachedir prefix="xdg">fontconfig</cachedir>\n'
        "</fontconfig>\n"
    )


@contextmanager
def _conversion_environment(lo_bin: str):
    """Provide a disposable CJK Fontconfig environment for macOS bundles.

    The normal environment is deliberately preserved on other platforms, or
    when an installed font cannot be located.  That leaves LibreOffice's
    native font fallback in charge for Windows, Linux, and ordinary installs.
    """
    if platform.system() != "Darwin":
        yield None, None
        return

    font_name = get_export_font_config("Darwin").cjk
    font_file = _find_cjk_font_file(font_name)
    if not font_file or not font_file.is_file():
        yield None, None
        return

    base_config = _find_fontconfig_file(lo_bin)
    with TemporaryDirectory(prefix="document-generation-pdf-", ignore_cleanup_errors=True) as temp_root:
        root = Path(temp_root)
        font_directory = root / "fonts"
        font_directory.mkdir()
        shutil.copyfile(font_file, font_directory / font_file.name)

        fontconfig_file = root / "fonts.conf"
        fontconfig_file.write_text(
            _fontconfig_with_font_directory(base_config, font_directory), encoding="utf-8"
        )
        cache_directory = root / "cache"
        cache_directory.mkdir()
        profile_directory = root / "profile"
        profile_directory.mkdir()

        environment = os.environ.copy()
        environment.update(
            {
                "FONTCONFIG_FILE": str(fontconfig_file),
                "FONTCONFIG_PATH": str(base_config.parent if base_config else root),
                "XDG_CACHE_HOME": str(cache_directory),
            }
        )
        yield environment, profile_directory.as_uri()
