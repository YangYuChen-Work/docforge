import pytest

from app.services.pdf_exporter import convert_to_pdf


def test_convert_to_pdf_raises_when_libreoffice_missing(monkeypatch, tmp_path):
    docx_path = tmp_path / "sample.docx"
    docx_path.write_bytes(b"fake-docx")

    monkeypatch.setattr("app.services.pdf_exporter._find_libreoffice", lambda: None)
    monkeypatch.setattr("app.services.pdf_exporter.settings.libreoffice_path", None)

    with pytest.raises(RuntimeError, match="LibreOffice 未找到"):
        convert_to_pdf(str(docx_path))
