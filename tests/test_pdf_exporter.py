import platform
import re
import shutil
import subprocess
from pathlib import Path

import pytest
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

from app.services import pdf_exporter
from app.services.export_fonts import get_export_font_config
from app.services.pdf_exporter import convert_to_pdf


def test_convert_to_pdf_raises_when_libreoffice_missing(monkeypatch, tmp_path):
    docx_path = tmp_path / "sample.docx"
    docx_path.write_bytes(b"fake-docx")

    monkeypatch.setattr("app.services.pdf_exporter._find_libreoffice", lambda: None)
    monkeypatch.setattr("app.services.pdf_exporter.settings.libreoffice_path", None)

    with pytest.raises(RuntimeError, match="LibreOffice 未找到"):
        convert_to_pdf(str(docx_path))


def test_convert_to_pdf_gives_bundled_soffice_a_temporary_cjk_font_environment(
    monkeypatch, tmp_path
):
    docx_path = tmp_path / "sample.docx"
    docx_path.write_bytes(b"fake-docx")
    font_path = tmp_path / "PingFang.ttc"
    font_path.write_bytes(b"installed-font")
    base_config = tmp_path / "fonts.conf"
    base_config.write_text("<fontconfig><dir>/bundled/fonts</dir></fontconfig>")

    monkeypatch.setattr(pdf_exporter.settings, "libreoffice_path", "/bundled/soffice")
    monkeypatch.setattr(pdf_exporter.platform, "system", lambda: "Darwin")
    monkeypatch.setattr(pdf_exporter, "_find_cjk_font_file", lambda _font_name: font_path)
    monkeypatch.setattr(pdf_exporter, "_find_fontconfig_file", lambda _lo_bin: base_config)

    calls = []
    observed = {}

    def fake_run(command, **kwargs):
        calls.append((command, kwargs))
        font_config = Path(kwargs["env"]["FONTCONFIG_FILE"])
        observed["font_config"] = font_config.read_text()
        observed["font_bytes"] = (font_config.parent / "fonts" / font_path.name).read_bytes()
        docx_path.with_suffix(".pdf").write_bytes(b"fake-pdf")
        return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

    monkeypatch.setattr(pdf_exporter.subprocess, "run", fake_run)

    assert convert_to_pdf(str(docx_path)) == str(docx_path.with_suffix(".pdf"))
    command, kwargs = calls[0]
    env = kwargs["env"]
    font_config = Path(env["FONTCONFIG_FILE"])

    assert command[0] == "/bundled/soffice"
    assert any(argument.startswith("-env:UserInstallation=file://") for argument in command)
    assert env["FONTCONFIG_PATH"] == str(base_config.parent)
    assert f"<dir>{font_config.parent / 'fonts'}</dir>" in observed["font_config"]
    assert observed["font_bytes"] == b"installed-font"
    assert not font_config.exists()


def test_convert_to_pdf_preserves_native_environment_off_macos(monkeypatch, tmp_path):
    docx_path = tmp_path / "sample.docx"
    docx_path.write_bytes(b"fake-docx")
    monkeypatch.setattr(pdf_exporter.settings, "libreoffice_path", "/system/soffice")
    monkeypatch.setattr(pdf_exporter.platform, "system", lambda: "Linux")

    calls = []

    def fake_run(command, **kwargs):
        calls.append((command, kwargs))
        docx_path.with_suffix(".pdf").write_bytes(b"fake-pdf")
        return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

    monkeypatch.setattr(pdf_exporter.subprocess, "run", fake_run)

    convert_to_pdf(str(docx_path))

    command, kwargs = calls[0]
    assert not any(argument.startswith("-env:UserInstallation=") for argument in command)
    assert "env" not in kwargs


@pytest.mark.skipif(platform.system() != "Darwin", reason="bundled CJK smoke test is macOS-specific")
def test_bundled_soffice_real_conversion_embeds_cjk_font_without_pixel_assertions(tmp_path):
    lo_bin = pdf_exporter.settings.libreoffice_path or pdf_exporter._find_libreoffice()
    strings_bin = shutil.which("strings")
    if not lo_bin or not strings_bin:
        pytest.skip("LibreOffice and strings are required for the real PDF smoke test")

    docx_path = tmp_path / "cjk.docx"
    doc = Document()
    run = doc.add_paragraph().add_run("中文 PDF 转换验证：产品概述、设计输入、质量目标。")
    fonts = get_export_font_config()
    r_fonts = OxmlElement("w:rFonts")
    for attribute, value in (
        ("ascii", fonts.latin),
        ("hAnsi", fonts.latin),
        ("eastAsia", fonts.cjk),
        ("cs", fonts.cjk),
    ):
        r_fonts.set(qn(f"w:{attribute}"), value)
    run._r.get_or_add_rPr().append(r_fonts)
    doc.save(docx_path)

    pdf_path = Path(convert_to_pdf(str(docx_path)))
    pdf_strings = subprocess.run(
        [strings_bin, str(pdf_path)], capture_output=True, text=True, check=True
    ).stdout

    assert re.search(r"PingFangSC|STHeitiSC|STSongti|HiraginoSans", pdf_strings)
