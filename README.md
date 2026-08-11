# DocForge

DocForge 是一个本地运行的项目文档生成 POC。它将项目、标准模板和真实来源资料组织为可追溯、可人工确认并可导出的 DOCX 文档。

## 目录

```text
backend/                 FastAPI 服务、迁移、脚本、依赖和后端测试
frontend/                Vue + Vite 独立前端
assets/scenario1/        受版本控制的场景 1 来源资料和 Word 模板
reference/demo-platform/ 静态 Demo，只作界面/种子数据参考
docs/                    产品、领域和技术文档
data/                    本地数据库、上传、解析和导出产物（已忽略）
```

## 本地启动

从仓库根目录执行：

```bash
uv python install 3.12
uv sync
(cd frontend && npm ci)

AI_PROVIDER=mock uv run uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

在第二个终端启动前端：

```bash
(cd frontend && npm run dev)
```

首次建立本地数据库或迁移旧场景模板路径后，运行：

```bash
uv run python backend/scripts/seed_demo_projects.py
```

后端运行后，可导入场景 1 资料：

```bash
uv run python backend/scripts/import_scenario1.py
```

`.env` 始终放在仓库根目录，`data/` 也始终位于仓库根目录；无论从根目录还是 `backend/` 执行命令，路径解析结果一致。

## 验证

```bash
(cd backend && uv run pytest -q)
(cd frontend && npm run build && node --test tests/*.test.mjs)
```

`pyproject.toml` 是 Python 依赖的唯一声明，`uv.lock` 固定可复现的精确版本。日常安装或更新环境运行 `uv sync`；在 CI 或需要严格复现时运行 `uv sync --locked`。不要再使用 `pip install -r backend/requirements.txt`。

更多业务规则、运行说明和 Windows 命令见 [`docs/README.md`](docs/README.md) 与 [`WINDOWS_SETUP.md`](WINDOWS_SETUP.md)。
