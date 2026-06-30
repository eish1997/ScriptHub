# Project Migration Handoff

> 这份文档用于把 ScriptHub 换到另一台电脑后继续开发和测试。优先按本文执行；产品方向、真实接入边界和开发历史再回看其他文档。

## 1. 当前项目一句话

ScriptHub 当前不是内置聊天工具，也不是传统 DCC 插件市场。它的定位是：

**AI 操作记录器 + 可复用工具库 + 自动化回放器 + 安全确认层 + Hermes 修复记录层。**

用户主要在外部 Hermes 里对话和操作。ScriptHub 负责把一次成功或失败后修复成功的操作沉淀成可再次运行的工具，保留参数、读写范围、产物、错误、修复建议和审计记录。

当前第一个真实场景是 **Maya 当前选择导出 FBX**。

## 1.1 与 AssetCutter 主仓的关系（2026-06-30）

**本仓库（`F:/AI/ScriptHub`）为 Script Hub / Creative Production Runtime 的唯一真源。**

AssetCutter 主仓 `assetcutter-ai-pro/script-hub/` 及 `server/script-hub-api.js`（:5174 / :9101）为 2026-05 半成品，**已废弃**，不再演进。伴侣壳第五导航、`ac.script_hub.*` 等待重新对齐本仓 Tool Bridge / Connector 后再接回主仓。

## 2. 搬迁时必须带走的内容

必须带走：

- `src/`：前端和运行态逻辑。
- `scripts/`：Tool Bridge、Maya Connector、真实 mayapy smoke test。
- `doc/`：产品、架构、开发进度和迁移文档。
- `package.json`、`package-lock.json`：依赖和脚本。
- `index.html`、`vite.config.*`、`tsconfig*.json`：前端工程配置。

可以不带走，到了新电脑重新生成：

- `node_modules/`：用 `npm install` 重新安装。
- `dist/`：用 `npm run build` 重新构建。
- `*.tsbuildinfo`：TypeScript 缓存。

按需带走：

- `.scripthub/tool-bridge-calls.json`：本地 Tool Bridge 历史调用记录。如果想保留之前的外部调用历史，就带走；如果只想干净开发，可以不带。
- 临时导出的 FBX 文件：一般位于系统临时目录或 `SCRIPTHUB_MAYA_CONNECTOR_ROOT` 指定目录。它们是测试产物，不是源码。

## 3. 新电脑基础依赖

必须安装：

- Node.js：建议使用当前稳定 LTS 或更高版本。
- npm：随 Node.js 安装。

可选但真实 Maya 链路需要：

- Autodesk Maya。
- Maya 自带的 `mayapy.exe`。
- Maya FBX 插件 `fbxmaya` 可正常加载。

不装 Maya 也可以继续开发 UI、文档、Tool Bridge 和 fixture 模式的 Connector；只是不能跑真实 mayapy 导出。

## 4. 第一次启动步骤

在新电脑进入项目目录后执行：

```powershell
npm install
npm test -- --run
npm run build
npm run dev
```

前端默认地址：

```text
http://localhost:5173/
```

如果端口被占用，Vite 会自动换端口，以终端显示的地址为准。

## 5. 本地服务启动顺序

### 5.1 只看前端

```powershell
npm run dev
```

这时 UI 可以打开，内部 mock runtime 可以演示工具中心、运行历史、安全确认、产物、审计和 Hermes 修复记录。

### 5.2 验证外部 Hermes 调用 ScriptHub

开两个终端。

终端 A：

```powershell
npm run tool-bridge:server
```

终端 B：

```powershell
npm run tool-bridge:demo
```

预期结果：

- Tool Bridge 服务默认运行在 `http://127.0.0.1:8787`。
- demo 会生成 `scriptHub.task.create` 和 `scriptHub.asset.register` 两条调用。
- 前端 Agent Activity / DevTools 会轮询并看到这些外部调用。

### 5.3 验证 Maya Connector fixture 模式

不需要安装 Maya。

终端 A：

```powershell
npm run tool-bridge:server
```

终端 B：

```powershell
npm run maya-connector:server
```

终端 C：

```powershell
npm run maya-connector:demo
```

预期结果：

- Maya Connector 默认运行在 `http://127.0.0.1:8795`。
- `/selection` 返回模拟选择对象。
- `/export/fbx` 写出一个 FBX 占位文件。
- Tool Bridge 里能看到任务创建和产物登记。

注意：fixture 模式只验证边界和链路，不代表已经调用真实 Maya。

### 5.4 验证真实 mayapy 环境

如果新电脑安装了 Maya，先跑：

```powershell
npm run maya-connector:real-smoke
```

预期结果：

- 脚本能找到 `mayapy.exe`，或提示需要手动配置。
- mayapy standalone 创建测试立方体。
- `fbxmaya` 插件加载成功。
- 输出一个真实 FBX 文件，并显示文件大小。

如果自动找不到 Maya，可手动设置：

```powershell
$env:SCRIPTHUB_MAYA_PYTHON_COMMAND = "C:\Program Files\Autodesk\Maya2025\bin\mayapy.exe"
npm run maya-connector:server
```

如果你的 Maya 版本不是 2025，把路径换成实际安装路径。

## 6. 关键环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `SCRIPTHUB_TOOL_BRIDGE_PORT` | `8787` | Tool Bridge HTTP 服务端口 |
| `SCRIPTHUB_TOOL_BRIDGE_STORE` | `.scripthub/tool-bridge-calls.json` | ToolCall 本地持久化文件 |
| `SCRIPTHUB_MAYA_CONNECTOR_PORT` | `8795` | Maya Connector HTTP 服务端口 |
| `SCRIPTHUB_MAYA_CONNECTOR_ROOT` | 系统临时目录下的 ScriptHub 目录 | fixture 导出文件根目录 |
| `SCRIPTHUB_MAYA_PYTHON_COMMAND` | 未设置 | 设置后启用真实 `maya_python_command` 模式 |
| `VITE_HERMES_BASE_URL` | 未设置 | 早期 Hermes adapter 切换入口；当前主链路仍以本地 Tool Bridge 验证为主 |

## 7. 新电脑验收清单

按顺序检查：

- `npm install` 成功。
- `npm test -- --run` 通过。
- `npm run build` 通过。
- `npm run dev` 后前端能打开。
- `npm run tool-bridge:server` 能启动。
- `npm run tool-bridge:demo` 能生成两条 ToolCall。
- `npm run maya-connector:server` 能启动。
- `npm run maya-connector:demo` 能完成 fixture 导出和资产登记。
- 如果有 Maya：`npm run maya-connector:real-smoke` 能导出真实 FBX。

当前最近一次本机验证结果见 [19-Development-Progress.md](./19-Development-Progress.md) 的“验证记录”。

## 8. 常见问题

### 8.1 前端打开了，但没有真实调用记录

通常是 Tool Bridge 服务没启动。先启动：

```powershell
npm run tool-bridge:server
```

然后再运行：

```powershell
npm run tool-bridge:demo
```

### 8.2 Maya Connector 显示 offline

通常是 Connector 服务没启动。启动：

```powershell
npm run maya-connector:server
```

如果仍然 offline，检查端口是否被占用，或设置 `SCRIPTHUB_MAYA_CONNECTOR_PORT` 后重启服务。

### 8.3 真实 Maya 导出失败，提示 `maya_python_unavailable`

说明当前命令不是 Maya Python 环境。设置：

```powershell
$env:SCRIPTHUB_MAYA_PYTHON_COMMAND = "你的 mayapy.exe 绝对路径"
npm run maya-connector:server
```

然后再执行真实链路。

### 8.4 提示 `empty_selection`

说明当前 Maya 没有可导出的选择对象。用户需要在 Maya 里选中对象，或后续让 Hermes 选择符合条件的节点后重试。

### 8.5 提示 `output_exists`

说明目标 FBX 已存在且当前参数不允许覆盖。解决方式是改名、允许覆盖，或让用户确认覆盖。

### 8.6 历史 ToolCall 太多

当前 ToolCall store 还没有归档/清理 UI。开发期可以删除 `.scripthub/tool-bridge-calls.json` 后重启 Tool Bridge，获得干净记录。

## 9. 当前开发状态

已经完成：

- 前端 MVP 工具中心、运行历史、产物、审计、Agent Activity、DevTools。
- Tool Bridge HTTP 验证服务。
- 外部 Hermes demo client。
- Maya Connector HTTP 验证服务。
- fixture 模式 Maya selection / export。
- mayapy 真实 smoke test。
- Connector 错误码到 Hermes 修复建议的映射。
- 前端轮询 Maya Connector 状态。
- 真实 `/export/fbx` 成功 / 失败结果进入 Agent Activity、Asset、Audit 的前端链路。

还没完成：

- 生产级后端持久化 store。
- 生产级鉴权、用户隔离、权限策略。
- MCP server 正式封装。
- Hermes 真实 client 配置与联调。
- 桌面级独立置顶工具小窗。
- ToolCall store 清理/归档。
- 从浏览器 UI 点击到真实 Maya Connector 的完整人工验收记录。

## 10. 换电脑后的下一步建议

先不要急着扩功能。建议按这个顺序恢复现场：

1. 跑通前端、测试和构建。
2. 跑通 Tool Bridge HTTP demo。
3. 跑通 Maya Connector fixture demo。
4. 如果新电脑有 Maya，跑通 `maya-connector:real-smoke`。
5. 启动前端 + Tool Bridge + Maya Connector，在工具中心点一次 Maya FBX 工具执行，确认 Asset、Agent Activity、Audit 三处能看到同一次导出。
6. 再继续开发 Connector 诊断事件、ToolCall store 清理和真实 Hermes 联调。

