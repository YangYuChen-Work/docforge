from app.services import export_fonts
from app.services.export_fonts import get_export_font_config


def test_export_font_config_selects_platform_cjk_font_and_latin_fallback():
    assert get_export_font_config("Darwin").cjk == "PingFang SC"
    assert get_export_font_config("Windows").cjk == "Microsoft YaHei"
    assert get_export_font_config("Linux").cjk == "Noto Sans CJK SC"
    assert get_export_font_config("Darwin").latin == "Arial"
    assert get_export_font_config("Linux").latin == "Arial"


def test_find_export_font_file_recursively_finds_songti_in_supplemental(monkeypatch, tmp_path):
    supplemental = tmp_path / "System" / "Library" / "Fonts" / "Supplemental"
    songti = supplemental / "nested" / "Songti.ttc"
    songti.parent.mkdir(parents=True)
    songti.write_bytes(b"songti")
    monkeypatch.setattr(
        export_fonts,
        "_MACOS_FONT_SEARCH_ROOTS",
        (supplemental,),
        raising=False,
    )

    assert export_fonts.find_export_font_file("Songti SC", "Darwin") == songti
