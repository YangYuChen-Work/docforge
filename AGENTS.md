# Codex 开发入口

这是 `document-generation` 项目的 Codex 工作入口。开始任何开发任务前，请先阅读：

1. `CONTEXT.md`：业务术语、范围和边界。
2. `docs/PRD.md`：功能需求和验收标准。
3. `docs/BUSINESS_DOMAIN.md`：业务流程、状态机和业务规则。
4. `docs/PROJECT_SPEC.md`：技术架构、数据模型和 API 约束。
5. `docs/IMPLEMENTATION_ROADMAP.md`：实施阶段和验收方式。
6. `CLAUDE.md`：原有代理执行约束。

## 当前开发约束

- 当前项目是单用户本地 POC，真实闭环是“项目 → 模板 → 来源资料 → 解析 → 章节生成 → 人工确认 → DOCX 导出”。
- 不要把 `reference/demo-platform` 的静态假数据当成真实 API 数据源。
- 生成内容必须带来源引用，或明确标记为“待补充”；不能用假成功掩盖解析、AI 或导出失败。
- 不覆盖用户提供的源文件；运行时文件写入 `data/`。
- AI 密钥只从本地 `.env` 或环境变量读取，不要写入代码、数据库、日志或回复。
- 新需求优先遵循用户最新明确要求；与旧文档冲突时，以用户要求为准，并在必要时更新文档基线。
- 文件路径可能包含中文。读写文件时统一使用 UTF-8，并避免依赖当前系统代码页。

## Windows 开发入口

Windows 环境准备、启动和测试命令见 `WINDOWS_SETUP.md`。不要把 `.venv/`、`frontend/node_modules/` 或 `.env` 重新打包提交。
