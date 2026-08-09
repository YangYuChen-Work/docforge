from app.services.export_fonts import get_export_font_config


def test_export_font_config_selects_platform_cjk_font_and_latin_fallback():
    assert get_export_font_config("Darwin").cjk == "PingFang SC"
    assert get_export_font_config("Windows").cjk == "Microsoft YaHei"
    assert get_export_font_config("Linux").cjk == "Noto Sans CJK SC"
    assert get_export_font_config("Darwin").latin == "Arial"
    assert get_export_font_config("Linux").latin == "Arial"
