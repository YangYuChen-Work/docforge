# DeepSeek V4 Pro AI 集成说明

## 1. 集成目标

当前 POC 的真实 AI Provider 使用 DeepSeek V4 Pro。AI 只负责基于项目资料和模板章节生成结构化内容，不直接读写数据库、不直接修改原始文件、不直接导出 Word。

业务调用链保持不变：

```text
项目 + 模板 + 已解析资料
  → 章节级上下文
  → DeepSeek V4 Pro
  → 结构化章节结果
  → 应用层校验
  → 保存正文、引用、待补充项和冲突
  → 人工确认
```

## 2. Provider 配置

默认配置约定：

```env
AI_PROVIDER=deepseek
AI_MODEL=deepseekv4-pro
AI_BASE_URL=
AI_API_KEY=
GENERATION_CONCURRENCY=4
```

说明：

- `AI_PROVIDER=deepseek`：选择 DeepSeek Provider。
- `AI_MODEL=deepseekv4-pro`：使用的模型标识。最终模型名称以实际接入的 DeepSeek 服务控制台为准，可通过环境变量调整，不要在代码中写死。
- `AI_BASE_URL`：DeepSeek 服务的 OpenAI-compatible API 地址，由开发者按实际服务配置填写。
- `AI_API_KEY`：DeepSeek 密钥，只允许从环境变量或本地未提交的 `.env` 文件读取。
- `GENERATION_CONCURRENCY`：独立章节的最大并发 AI 请求数，默认 4；应根据服务限流和本地资源逐步调节，不建议无上限并发。

如果实际服务的接口协议不是 OpenAI-compatible，不改变业务层，只替换 `DeepSeekProvider` 的适配实现。

## 3. 密钥安全存放方式

本地 POC 推荐把密钥写在项目根目录的 `.env` 文件中：

```text
D:\桌面\Nancal\document-generation\.env
```

`.env` 只保存在本机，不提交到 Git，不粘贴到聊天、代码、截图、日志或 PR 中。项目提供的 `.env.example` 只包含空配置项，可以提交和复制使用。

推荐操作：

1. 复制 `.env.example` 为 `.env`。
2. 在 `.env` 中填写真实的 `AI_BASE_URL` 和 `AI_API_KEY`。
3. 将 `AI_PROVIDER` 设置为 `deepseek`，确认 `AI_MODEL` 为实际可用的模型标识。
4. 启动后端时由配置模块加载环境变量。
5. 在日志中只记录 Provider、模型、任务 ID、耗时和错误类型，不记录密钥。

如果后续部署到服务器，不再把密钥写入项目文件，改用部署平台的 Secret、操作系统环境变量或密钥管理服务。

## 4. 代码边界

建议实现：

```python
class AIProvider(Protocol):
    def generate_chapter(
        self,
        request: ChapterGenerationRequest,
    ) -> ChapterGenerationResult:
        ...


class DeepSeekProvider:
    """只负责调用模型并返回结构化结果。"""
```

Provider 层负责：

- 读取模型配置。
- 组装当前章节请求。
- 调用 DeepSeek V4 Pro。
- 处理超时、限流、网络失败和模型不可用。
- 解析和返回结构化 JSON。

Provider 层不负责：

- 决定用户是否可以导出文档。
- 修改文档章节确认状态。
- 修改原始来源文件。
- 绕过引用、冲突和待补充项校验。

## 4.1 章节并行生成

初始生成时，章节之间没有前置确认内容依赖，可以按章节并行调用 Provider。实现使用有上限的线程池：工作线程只调用 Provider，资料快照、引用校验和 SQLite 写入由协调线程完成。

这样可以缩短总等待时间，同时避免多个线程共享 SQLAlchemy Session、竞争 SQLite 写锁或混淆章节引用。若未来章节之间建立内容依赖，应按依赖关系分波次，同一波内并行、不同波次串行。

## 5. 模型输出契约

模型输出必须经过 Pydantic 或等价结构校验后才能保存：

```json
{
  "chapter_id": "market_analysis",
  "content": "章节正文或结构化内容",
  "citations": [
    {
      "source_document_id": "source-001",
      "locator": "表1 / 第2行",
      "quote_or_summary": "来源内容摘要"
    }
  ],
  "missing_information": [],
  "conflicts": [],
  "confidence": "medium"
}
```

强制规则：

- 没有来源依据的事实必须放入 `missing_information`，不能编造。
- 多来源内容不一致时必须写入 `conflicts`，不能静默选一个。
- `citations` 至少包含来源文件 ID；可定位时继续记录标题、表格、段落或单元格。
- 返回不是合法 JSON 或缺少必要字段时，章节进入失败状态，不得保存为正常生成结果。
- AI 生成完成只代表形成草稿，必须经过人工确认才能导出为正式文档。

## 6. 研发和运行模式

| 模式 | 配置 | 用途 |
|---|---|---|
| Mock | `AI_PROVIDER=mock` | 无密钥开发、自动化测试和固定结果验收 |
| DeepSeek | `AI_PROVIDER=deepseek` | 使用真实模型完成场景1章节生成 |

没有密钥时不得伪装成 DeepSeek 已调用成功，应明确显示 Mock 模式或配置缺失。

## 7. Claude Code 执行约束

Claude Code 开始 AI 相关开发前必须：

1. 读取 `CLAUDE.md`、`CONTEXT.md`、`docs/PRD.md`、`docs/BUSINESS_DOMAIN.md`、`docs/PROJECT_SPEC.md` 和本文件。
2. 检查本地环境是否存在 `AI_API_KEY`，但不得把密钥内容输出到终端、回复或日志。
3. 未发现密钥时先使用 Mock Provider 完成接口、状态机和测试，不要求用户提供密钥。
4. 真实调用只允许使用当前章节匹配到的来源资料，不允许把整个本地资料目录无差别上传给模型。
5. 测试中使用 Mock Provider 或独立测试密钥，不能把真实密钥写入测试代码。

## 8. POC 验收

- Mock 模式可以完整跑通生成任务状态机。
- DeepSeek 模式可以通过配置切换，不需要修改业务代码。
- DeepSeek 调用失败时能看到明确错误和重试入口。
- 生成章节包含引用、待补充项和冲突字段。
- 真实密钥不会出现在 Git、日志、异常堆栈、数据库业务字段或导出的 DOCX 中。
