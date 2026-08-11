# 项目文档生成 POC 文档索引

这组文档是本项目交给 Claude Code 或其他 AI 开发代理使用的业务与技术基线。当前目标不是继续扩展静态 Demo，而是完成“场景1文档生成”的真实、本地、轻量闭环。

## 推荐阅读顺序

1. [`CONTEXT.md`](../CONTEXT.md)：统一业务术语、范围和边界。
2. [`PRD.md`](./PRD.md)：功能需求、用户故事、场景1资料映射和验收标准。
3. [`BUSINESS_DOMAIN.md`](./BUSINESS_DOMAIN.md)：业务流程、状态机和业务规则。
4. [`PROJECT_SPEC.md`](./PROJECT_SPEC.md)：技术架构、数据模型、API 和前端改造原则。
5. [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md)：按阶段实施和每阶段验收方式。
6. [`CLAUDE.md`](../CLAUDE.md)：Claude Code 的执行约束和默认验收要求。
7. [`AI_INTEGRATION.md`](./AI_INTEGRATION.md)：DeepSeek V4 Pro、密钥安全存放和 AI Provider 约束。

## 当前唯一真实闭环

```text
选择项目
  → 选择真实 Word 模板
  → 关联场景1真实来源资料
  → 解析 DOCX/XLSX
  → 按模板章节匹配资料
  → AI 或 Mock AI 生成章节
  → 显示引用、缺失项和冲突
  → 人工修改/确认
  → 导出 DOCX
```

## 现有资产与目标系统的关系

| 资产 | 用途 | 处理原则 |
|---|---|---|
| `reference/demo-platform/doc-data.js` | 项目和模板种子数据参考 | 项目初始数据必须从 `DOC_PROJECTS` 导入 |
| `reference/demo-platform/doc-assistant.html` | 项目文档列表布局参考 | 可以复用信息架构，改为工程管理视觉 |
| `reference/demo-platform/doc-new.html` | 新建文档向导参考 | 保留项目、模板、资料确认流程 |
| `reference/demo-platform/doc-editor.html` | 三栏编辑器参考 | 保留章节、正文、引用和操作区 |
| `reference/demo-platform/doc-config.html` | 模板/系统配置参考 | POC 只实现必要配置，不扩展企业级管理 |
| `assets/scenario1/sources/` | 真实 DOCX/XLSX 输入 | 不修改原文件，导入后解析到本地数据目录 |
| `assets/scenario1/templates/XX产品开发立项暨设计和开发输入报告.docx` | 目标 Word 结构参考 | 复制后写入生成结果，不覆盖原文件 |
| `docs/media/` | 本地演示录屏 | 已忽略，不作为程序源文件或接口依据 |

## 开发时的最小判断标准

- 任何生成内容都必须有来源引用，或明确显示为“待补充”。
- 解析失败、AI 失败、导出失败都必须是真实失败状态，不能展示假成功。
- 项目、模板、来源资料、生成任务和文档版本必须落到 SQLite 或本地文件中，不能只保存在浏览器内存。
- 前端使用克制的工程管理语言和视觉，重点展示项目、资料、章节、引用、冲突和状态。
- 测试用例生成、BOM 选配、多用户权限和复杂检索暂不进入当前 POC。
- AI 真实调用使用 DeepSeek V4 Pro；没有密钥时使用 Mock Provider，不把密钥写入代码或提交到 Git。
