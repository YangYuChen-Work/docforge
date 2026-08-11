# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开始工作前必须阅读

1. `CONTEXT.md` — 统一业务术语和核心概念定义
2. `docs/PRD.md` — 功能需求、用户故事、场景1资料映射和验收标准
3. `docs/BUSINESS_DOMAIN.md` — 业务流程、状态机（来源资料/生成任务/章节）和业务规则 BR-001 到 BR-008
4. `docs/PROJECT_SPEC.md` — 技术架构、数据模型（10 个表）、API 草案和前端改造原则
5. `docs/IMPLEMENTATION_ROADMAP.md` — 7 个阶段的实施顺序和每阶段验收方式
6. `docs/AI_INTEGRATION.md` — DeepSeek V4 Pro 配置、密钥安全存放和 Provider 代码边界

如果代码、用户新需求和文档发生冲突，以用户最新明确要求为最高优先级；否则以 `CONTEXT.md` 的业务术语和 `docs/PRD.md` 的范围为准。

## 技术栈

| 层 | 选型 |
|---|---|
| 后端框架 | Python 3.11+, FastAPI, Pydantic |
| 数据库 | SQLite + SQLAlchemy 2.x + Alembic |
| 文档解析 | `python-docx`（DOCX 段落/标题/表格）、`openpyxl`（XLSX 工作表/单元格） |
| 文档输出 | `python-docx`（写入模板、保留样式、导出 DOCX） |
| AI Provider | DeepSeek V4 Pro（OpenAI-compatible 协议），通过 `AIProvider` Protocol 隔离；无密钥时使用 `MockAIProvider` |
| 前端 | Vue 3 + Vite，独立项目（前后端分离），复用 `reference/demo-platform` 信息架构，视觉为克制工程管理风格 |

## 当前项目状态

项目已具备前后端分离的本地 POC：后端位于 `backend/`，前端位于 `frontend/`，运行时数据统一写入根目录 `data/`。具体实现阶段和验收方式见 `docs/IMPLEMENTATION_ROADMAP.md`。

## 常用命令

从仓库根目录执行以下命令：

```bash
# 1. 创建 Python 虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 2. 安装后端依赖
pip install -r backend/requirements.txt

# 3. 启动开发服务器
python -m uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000

# 4. 运行种子数据导入
python backend/scripts/seed_demo_projects.py

# 5. 运行场景1资料导入
python backend/scripts/import_scenario1.py
```

测试与前端构建：

```bash
(cd backend && ../.venv/bin/python -m pytest -q)
(cd frontend && npm run build)
```

## 目录结构（目标）

```
document-generation/
├── backend/                # FastAPI 服务、迁移、脚本、依赖与后端测试
│   ├── app/                # API、领域服务、AI Provider 与配置
│   ├── alembic/            # 数据库迁移
│   ├── scripts/            # 种子数据和场景导入脚本
│   ├── tests/              # 后端与场景验收测试
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/               # 独立 Vue + Vite 前端
├── data/                   # 运行时数据目录（gitignore）
│   ├── app.db
│   ├── uploads/
│   ├── parsed/
│   └── generated/
├── assets/scenario1/       # 真实验收资料包（源文件只读）
│   ├── sources/            # 10 个 DOCX + 2 个 XLSX 来源资料
│   └── templates/          # 目标 Word 模板
├── reference/demo-platform/ # 静态 Demo，仅作布局与种子数据参考
├── .env.example            # 环境变量模板（可提交）
├── .env                    # 真实密钥（gitignore，禁止提交/粘贴/记录到日志）
└── .gitignore
```

## 当前 POC 目标

只把"场景1文档生成"做成真实闭环：

`选择项目 → 选择真实模板 → 关联真实来源资料 → 解析资料 → 按章节生成 → 保存引用 → 人工确认/修改 → 导出 DOCX`

测试用例生成、BOM 智能选配、企业级权限和多租户暂不实现真实后端能力。

## 重要开发约束

- 项目种子数据使用 `reference/demo-platform/doc-data.js` 中的 `DOC_PROJECTS`（P001–P005），不要重新虚构一套项目数据。
- 前端复用 `reference/demo-platform` 的信息架构，但视觉必须是克制的工程管理界面：白/浅灰/深蓝 + 状态色（蓝=当前操作，绿=完成，橙=待确认，红=错误/冲突），不使用强烈渐变、机器人图标、魔法式文案或夸张 AI 营销卡片。
- 真实生成链路不能用"假成功"代替失败。缺少资料、解析失败或模型失败时必须显示明确状态和错误信息。
- AI 输出必须包含来源引用或明确标记"待补充"，禁止把缺失信息伪装成事实。
- 不覆盖用户提供的源文件；所有解析、规范化和生成结果写入 `data/` 目录。
- 优先使用简单的本地方案，不引入微服务、Redis、向量数据库或复杂权限系统，除非后续需求明确要求。
- AI 真实 Provider 使用 DeepSeek V4 Pro；密钥只从本地 `.env` 或运行环境读取，禁止写入代码、数据库、日志和回复内容。
- 未配置 DeepSeek 密钥时使用 Mock Provider 验证业务流程，不得伪装成真实模型调用成功。
- 每个重要业务动作都要可追踪：上传、解析、生成、重新生成、人工修改、确认、导出和失败。
- 新增功能必须先补充需求/验收说明，再实现代码。
- 场景1 目标模板引用了"服务可行性分析报告"，但来源资料目录中没有这份文件——POC 必须将其显示为"资料缺失"，不能假设该资料存在。

## 关键业务规则

| 规则 | 内容 |
|---|---|
| BR-001 | 一个项目可拥有多个文档，一个文档只归属于一个项目 |
| BR-003 | 没有来源依据的字段必须标记为待补充，不允许默认填充为事实 |
| BR-004 | AI 生成的事实性内容至少记录来源文件；能定位到章节/表格/单元格时必须记录更细定位 |
| BR-005 | 多个来源对同一事实有不同内容时，必须展示冲突并交给用户确认，不得静默选择 |
| BR-006 | 重新生成章节必须保存旧版本内容、旧引用和生成时间 |
| BR-007 | 源文件只读，生成内容必须写入独立文档或版本 |

完整业务规则见 `docs/BUSINESS_DOMAIN.md` 第 6 节。

## AI 生成调用约束

- 每次调用只传递当前章节需要的上下文（项目信息 + 模板章节要求 + 匹配的源文件片段 + 结构化表格数据 + 已知缺失/冲突），禁止把所有资料无差别塞给模型。
- 模型返回必须是结构化 JSON（`content`、`citations`、`missing_information`、`conflicts`、`confidence`），经 Pydantic 校验后才保存。
- 返回不是合法 JSON 或缺少必要字段时，章节进入 `failed` 状态。
- 切换 Provider（Mock/DeepSeek）只能通过 `AI_PROVIDER` 环境变量，不改业务代码。

## 验收方式

默认使用 `assets/scenario1` 目录作为真实验收资料包，至少验证：

- 能识别 Word 和 Excel 来源资料
- 能建立来源资料与目标模板章节的匹配关系
- 能生成章节级内容和引用
- 缺少资料时能形成待补充项
- 能生成可打开的 DOCX
- 失败状态和日志可查看

完整 POC 验收标准见 `docs/PRD.md` 第 9 节（10 条）。
