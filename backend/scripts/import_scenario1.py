import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from app.config import SCENARIO1_SOURCE_DIR

BASE_URL = "http://localhost:8000"
PROJECT_ID = "P001"
SOURCE_DIR = SCENARIO1_SOURCE_DIR


def import_all():
    files = sorted(list(SOURCE_DIR.glob("*.docx")) + list(SOURCE_DIR.glob("*.xlsx")))
    print(f"找到 {len(files)} 个资料文件")
    imported = []
    for f in files:
        with open(f, "rb") as fobj:
            r = requests.post(
                f"{BASE_URL}/api/projects/{PROJECT_ID}/sources",
                files={"file": (f.name, fobj, "application/octet-stream")},
            )
        if r.status_code == 200:
            data = r.json()
            source_id = data["source_id"]
            status = data["parse_status"]
            print(f"  上传: {f.name} -> {source_id[:8]}... ({status})")
            imported.append(source_id)
        else:
            print(f"  失败: {f.name} -> {r.status_code} {r.text[:80]}")

    print(f"\n开始解析 {len(imported)} 个资料...")
    for source_id in imported:
        r = requests.post(f"{BASE_URL}/api/sources/{source_id}/parse")
        data = r.json()
        ps = data["parse_status"]
        err = f" | 错误: {data['parse_error'][:60]}" if data.get("parse_error") else ""
        print(f"  {source_id[:8]}... -> {ps}{err}")

    print(f"\n完成！已导入 {len(imported)} 个资料到项目 {PROJECT_ID}")
    print(f"查看资料列表: curl {BASE_URL}/api/projects/{PROJECT_ID}/sources | python3 -m json.tool")


if __name__ == "__main__":
    import_all()
