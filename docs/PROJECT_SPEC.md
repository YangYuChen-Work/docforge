# 场景1文档生成 POC 项目技术说明

## 1. 技术目标

在不引入重型基础设施的前提下，将 `reference/demo-platform` 的业务流程升级为一个本地可运行的真实 POC：

- 真实保存项目、模板、资料、任务和文档状态。
- 真实解析 DOCX/XLSX。
- 真实调用 AI 或可切换 Mock AI。
- 真实生成 DOCX。
- 真实保留引用、版本和错误记录。

## 2. POC 架构

```text
浏览器
  │
  ├── 静态前端：保留 Demo 的布局与交互思想
  │
  ▼
FastAPI 本地服务
  ├── 项目/模板/资料 API
  ├── 生成任务 API
  ├── 章节生成 API
  ├── 文档版本 API
  ├── 导出 API
  └── AI Provider
        ├── Mock Provider
        └── OpenAI-Compatible Provider
  │
  ├── SQLite：业务状态和元数据
  ├── data/uploads：源文件和模板
  ├── data/parsed：解析后的结构化中间数据
  └── data/generated：生成文档和导出结果
```

## 3. 推荐技术栈

### 后端

- Python 3.11+
- FastAPI
- Pydantic
- SQLAlchemy 2.x
- SQLite
- Alembic（保留简单迁移能力）

### 文档处理

- `python-docx`：DOCX 段落、标题、表格、基础格式处理。
- `openpyxl`：XLSX 工作簿、工作表和单元格读取。
- 可选 `pypdf`：PDF 解析，为后续扩展预留。
- 可选 LibreOffice：复杂 DOCX/PDF 转换和版式检查；环境不可用时必须给出明确提示。

### 前端

POC 可以继续使用现有静态 HTML/CSS/JS，建议逐步做以下调整：

- 将 Demo 中的内嵌假数据替换为 API 请求。
- 保留项目列表、生成向导、三栏编辑器和配置页面的信息架构。
- 将“AI 助手”视觉改为“生成建议”“引用来源”“内容协作”等工程术语。
- 不引入 React/Next.js，除非原生静态页面已经明显阻碍功能开发。

### AI

使用 Provider 接口隔离模型供应商：

```python
class AIProvider(Protocol):
    def generate_chapter(self, request: ChapterGenerationRequest) -> ChapterGenerationResult:
        ...
```

至少实现：

- `MockAIProvider`：用于本地测试、无网络开发和固定结果验证。
- `DeepSeekProvider`：用于真实 DeepSeek V4 Pro 调用，模型地址、模型名和密钥从环境变量读取。

AI Provider 不直接读写数据库、不直接修改 Word 文件，只负责输入结构化上下文并返回结构化生成结果。

真实 AI 配置见 [`AI_INTEGRATION.md`](./AI_INTEGRATION.md)。默认环境变量为：

```text
AI_PROVIDER=deepseek
AI_MODEL=deepseekv4-pro
AI_BASE_URL=
AI_API_KEY=
```

密钥只放在项目根目录未提交的 `.env` 文件或部署环境变量中；开发和测试没有密钥时使用 `AI_PROVIDER=mock`。

## 4. 目录结构建议

```text
document-generation/
├── AGENTS.md
├── CONTEXT.md
├── .python-version                # uv 使用的 Python 主版本（3.12）
├── pyproject.toml                 # Python 依赖与 Python 3.12 约束
├── uv.lock                        # uv 精确依赖锁定文件
├── docs/
│   ├── PRD.md
│   ├── BUSINESS_DOMAIN.md
│   ├── PROJECT_SPEC.md
│   └── IMPLEMENTATION_ROADMAP.md
├── backend/
│   ├── app/                       # FastAPI 入口、API、领域与服务代码
│   ├── alembic/                   # 数据库迁移
│   ├── scripts/                   # 种子数据与场景导入
│   ├── tests/                     # 后端与场景验收测试
│   └── alembic.ini
├── frontend/                      # 独立 Vue + Vite 项目
├── data/
│   ├── app.db
│   ├── uploads/
│   ├── parsed/
│   └── generated/
├── assets/scenario1/              # 只读场景资料与模板
│   ├── sources/
│   └── templates/
└── reference/demo-platform/       # 静态参考，不作为生产 API 数据源
```

实际实现可以先减少目录层级，但业务边界不要混在一个超大文件中。

## 4.1 现有 Demo 资产映射

现有 `reference/demo-platform` 是静态交互 Demo，不是目标系统的后端。目标系统应复用它验证过的信息架构和交互顺序，但将数据来源替换为本地 API 和 SQLite。

| Demo 资产 | 目标系统用途 |
|---|---|
| `doc-data.js` 中的 `DOC_PROJECTS` | 项目种子数据，必须导入 P001-P005 |
| `doc-data.js` 中的 `DOC_TEMPLATES` | 初始模板元数据参考；场景1另需登记真实 Word 模板 |
| `doc-assistant.html` | 项目/文档列表页布局参考 |
| `doc-new.html` | 项目、模板、来源资料确认向导参考 |
| `doc-editor.html` | 章节树、正文、引用和操作区布局参考 |
| `doc-config.html` | 模板配置和生成规则页面参考 |

目标前端不应继续依赖 `doc-data.js` 作为运行时业务数据，也不应保留 Demo 中与真实后端无关的假进度、假生成结果或静态成功提示。

## 5. 数据模型

### 5.1 Project

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | P001 等业务 ID |
| name | string | 项目名称 |
| code | string | 项目编号 |
| model | string | 产品型号 |
| phase | string | 研发阶段 |
| category | string | 产品类别 |
| status | string | 项目状态 |
| created_at | datetime | 创建时间 |

初始数据从 `DOC_PROJECTS` 导入，不在代码中重新维护第二套项目数据。

### 5.2 DocumentTemplate

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | T001 等模板 ID |
| name | string | 模板名称 |
| phase | string | 适用阶段 |
| category | string | 设计类、分析类等 |
| source_path | string | 模板文件路径 |
| version | string | 模板版本 |
| enabled | boolean | 是否可选择 |
| chapter_config | json | 章节生成配置 |

### 5.3 SourceDocument

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 来源资料 ID |
| project_id | string | 关联项目 |
| original_name | string | 原始文件名 |
| stored_path | string | 本地保存路径 |
| file_type | string | docx/xlsx/pdf |
| sha256 | string | 文件哈希 |
| parse_status | string | uploaded/parsing/parsed/failed |
| parse_error | text | 解析错误 |
| uploaded_at | datetime | 上传时间 |

### 5.4 ParsedSourceContent

保存来源文件解析结果，不修改原文件。

建议字段：

- source_document_id
- content_type：paragraph、heading、table、image
- locator：章节、表格编号、行列等
- heading_path
- content_text
- structured_value
- order_index

POC 不需要向量数据库。先用章节配置、文件类型、关键词和全文搜索完成资料匹配。

### 5.5 GenerationTask

字段：

- id
- project_id
- template_id
- status
- requested_by
- selected_source_ids
- started_at
- finished_at
- error_message

### 5.6 GeneratedDocument

字段：

- id
- project_id
- generation_task_id
- template_id
- title
- status
- current_version_id
- output_path
- created_at

### 5.7 DocumentChapter

字段：

- id
- document_id
- template_chapter_id
- title
- order_index
- status
- content_json
- plain_text
- missing_information_json
- conflict_json
- confirmed_at

### 5.8 Citation

字段：

- id
- chapter_id
- source_document_id
- locator
- source_excerpt
- citation_type：direct、summary、calculation、manual
- created_at

### 5.9 DocumentVersion

字段：

- id
- document_id
- version_number
- change_type：generated、regenerated、manual_edit、confirmed、exported
- snapshot_path 或 snapshot_json
- created_by
- created_at

### 5.10 AuditLog

字段：

- id
- actor
- action
- entity_type
- entity_id
- payload_json
- result
- error_message
- created_at

## 6. API 草案

### 项目

```text
GET    /api/projects
GET    /api/projects/{project_id}
```

### 模板

```text
GET    /api/templates
GET    /api/templates/{template_id}
POST   /api/templates/{template_id}/validate
```

### 来源资料

```text
GET    /api/projects/{project_id}/sources
POST   /api/projects/{project_id}/sources
POST   /api/sources/{source_id}/parse
GET    /api/sources/{source_id}
GET    /api/sources/{source_id}/content
```

### 生成任务

```text
POST   /api/generation-tasks
GET    /api/generation-tasks/{task_id}
POST   /api/generation-tasks/{task_id}/start
GET    /api/generation-tasks/{task_id}/chapters
```

### 文档和章节

```text
GET    /api/documents/{document_id}
GET    /api/documents/{document_id}/chapters/{chapter_id}
POST   /api/documents/{document_id}/chapters/{chapter_id}/regenerate
POST   /api/documents/{document_id}/chapters/{chapter_id}/confirm
POST   /api/documents/{document_id}/chapters/{chapter_id}/edit
GET    /api/documents/{document_id}/versions
```

### 导出

```text
POST   /api/documents/{document_id}/export
GET    /api/exports/{export_id}
```

## 7. 生成管线

```text
保存原始文件
  → 文件哈希去重
  → DOCX/XLSX 解析
  → 统一内容结构
  → 章节资料匹配
  → 形成章节上下文
  → AI 结构化生成
  → 保存正文/引用/待补充/冲突
  → 用户确认或修改
  → 将章节写回模板
  → 导出 DOCX
```

## 8. AI 上下文构造

每次调用只传递当前章节需要的内容，避免将所有文件无差别塞给模型。

上下文组成：

1. 项目基本信息。
2. 目标模板名称和章节要求。
3. 当前章节结构。
4. 匹配的源文件片段。
5. 结构化表格数据。
6. 已确认的前置章节内容。
7. 用户本次修改要求。
8. 已知缺失项和冲突。

模型返回必须使用结构化 JSON，应用层校验字段后再保存。

## 9. 错误处理

### 文件解析错误

- 保存原文件。
- 记录 `parse_failed`。
- 显示文件名和异常原因。
- 允许用户重新解析。

### AI 调用错误

- 保存本次请求摘要，不保存密钥。
- 记录超时、限流、格式校验失败或服务不可用。
- 章节状态变为 `failed`。
- 提供重试入口。

### DOCX 导出错误

- 不删除已生成章节。
- 保留文档版本。
- 记录模板路径、输出路径和错误信息。
- 页面显示“生成内容可查看，但导出失败”。

## 10. 本地配置

建议环境变量：

```text
APP_ENV=development
DATABASE_URL=sqlite:///./data/app.db
STORAGE_ROOT=./data
AI_PROVIDER=mock
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
```

默认 `AI_PROVIDER=mock`，确保无网络或无密钥时仍可运行测试；真实演示时切换为真实 Provider。

## 11. 前端改造原则

保留 Demo 的业务布局：

- 左侧导航。
- 项目列表。
- 新建文档向导。
- 三栏文档编辑器。
- 模板配置页面。

调整视觉和文案：

- “AI 文档助手”可改成“项目文档工作台”。
- “AI 协作”改为“内容协作”或“生成建议”。
- “AI 生成”改为“生成章节”或“按资料生成”。
- 移除大量装饰性数字卡片，保留真正有业务意义的统计。
- 引用、缺失资料、冲突和版本使用明确的状态标签。

## 12. 测试策略

### 单元测试

- DOCX 解析器能提取标题、段落和表格。
- XLSX 解析器能提取工作表和单元格。
- 文件哈希重复识别正确。
- 章节匹配状态判断正确。
- AI JSON 结果校验正确。
- 缺少资料不会产生虚构事实。

### 集成测试

- 导入场景1资料包。
- 创建 P001 生成任务。
- 完成至少一个章节生成。
- 保存引用和待补充项。
- 导出 DOCX。

### 人工验收

- Word 可以打开。
- 模板主要章节仍在。
- 章节内容位置正确或有明确待处理提示。
- 引用可以回到来源文件。
- 失败状态清晰可理解。
