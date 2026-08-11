# Windows 开发说明

本项目压缩包中的文件名使用 ZIP 标准 UTF-8 标记保存。Windows 10/11 的资源管理器和 7-Zip 均可正常解压中文文件夹与文件名。

## 1. 环境要求

- Windows 10 或 Windows 11
- uv（负责安装和管理 Python 3.12 环境）
- Node.js 20.19+ 或 22.12+
- Git for Windows（需要继续使用 Git 历史时安装）
- 可选：LibreOffice，用于 PDF/DOCX 导出相关能力

## 2. 解压与首次安装

建议将压缩包解压到不含特殊字符的工作目录，例如 `D:\dev\document-generation`。项目内部的中文业务资料目录可以保留原名。

在 PowerShell 中执行：

```powershell
Set-Location D:\dev\document-generation

uv python install 3.12
uv sync

Set-Location frontend
npm ci
Set-Location ..
```

如果尚未安装 uv，可在管理员或普通 PowerShell 中使用 winget 安装：

```powershell
winget install --id=astral-sh.uv -e
```

`uv sync` 会在项目根目录创建 `.venv`；无需手动激活该虚拟环境。

## 3. 启动后端和前端

打开第一个 PowerShell 窗口：

```powershell
Set-Location D:\dev\document-generation
$env:AI_PROVIDER = "mock"
uv run uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

打开第二个 PowerShell 窗口：

```powershell
Set-Location D:\dev\document-generation\frontend
npm run dev
```

按 Vite 输出的地址打开前端页面。没有真实 AI 密钥时使用 `AI_PROVIDER=mock`，不要把密钥写进脚本或提交到 Git。

## 4. 测试

```powershell
Set-Location D:\dev\document-generation\backend
uv run pytest -q

Set-Location ..\frontend
npm run build
node --test tests\*.test.mjs
```

## 5. 中文路径注意事项

- 使用 PowerShell、Windows Terminal 或 UTF-8 配置的编辑器操作项目。
- 不要用旧版仅支持系统代码页的解压工具；如果出现乱码，改用 Windows 资源管理器或最新版 7-Zip 重新解压。
- Git 命令可使用 `git config --global core.quotepath false` 显示中文文件名。
- `.env`、`.venv`、`frontend\node_modules` 和缓存目录属于本机环境，不应复制回压缩包。
