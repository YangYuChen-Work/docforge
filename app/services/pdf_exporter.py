import subprocess
import shutil
from pathlib import Path
from app.config import settings


def convert_to_pdf(docx_path: str) -> str:
    docx = Path(docx_path)
    pdf_path = docx.with_suffix(".pdf")

    lo_bin = settings.libreoffice_path or _find_libreoffice()
    if not lo_bin:
        raise RuntimeError(
            "LibreOffice 未找到。请安装 LibreOffice 或设置 LIBREOFFICE_PATH 环境变量。"
        )

    result = subprocess.run(
        [lo_bin, "--headless", "--convert-to", "pdf", "--outdir", str(docx.parent), str(docx)],
        capture_output=True,
        text=True,
        timeout=60,
    )
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
