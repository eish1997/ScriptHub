# Desktop Floating Window Plan

> 本文定义 ScriptHub 工具小窗的目标体验和工程边界。核心结论：`ToolFloatingWindow` 不是浏览器内弹层，而是桌面级、可置顶、可拖动、可缩放、可悬浮在 DCC 上方的独立工具窗口。Web 内窗口只作为 MVP fallback。

## 1. 目标体验

用户在工具中心点击某个工具后，ScriptHub 应打开一个独立工具小窗：

- 小窗脱离主浏览器页面或主窗口。
- 小窗可以置顶，悬浮在 Maya / Blender / Unreal 等 DCC 软件上方。
- 用户可以拖动、缩放、关闭、重新打开小窗。
- 小窗记住上次位置、尺寸和置顶状态。
- 小窗只服务当前工具，不是常驻全局控制台。
- 小窗内展示参数、安全确认、执行状态、产物、错误和 Hermes 修复。
- 用户可以一边看 DCC 场景，一边在小窗中调整参数并执行工具。

## 2. 命名约定

- `ToolFloatingWindow`：桌面级工具小窗，最终产品目标。
- `ToolFloatingWindowContent`：工具小窗的 React 内容层，包含参数、安全确认、运行状态、产物和 Hermes 修复。
- `ToolInlinePanel`：浏览器内 fallback，复用 `ToolFloatingWindowContent`，但不承诺脱离浏览器、置顶、拖动到 DCC 上方。
- `ToolWindowBridge`：桌面壳暴露给前端的窗口控制接口。

不要再用 `ToolOverlay` 表示正式目标。`overlay` 只能作为历史实现或浏览器 fallback 的内部描述。

## 3. 分层边界

### 3.1 桌面壳层

桌面壳负责浏览器无法可靠完成的能力：

- 创建独立窗口。
- 设置 always-on-top。
- 设置窗口透明度、阴影、边框和最小尺寸。
- 支持拖动、缩放、最小化、关闭。
- 记住窗口位置、尺寸、置顶状态和所属显示器。
- 将窗口定位到当前 DCC 附近或上次使用位置。
- 在主窗口和工具小窗之间同步工具运行状态。

候选实现：

- Electron：窗口 API 成熟，适合快速验证。
- Tauri：体积更小，Rust 桌面壳，适合后续产品化评估。

### 3.2 前端内容层

React 负责可复用内容：

- 工具名称、分类、成熟度、DCC、来源标签。
- 参数表单和参数校验。
- 安全确认：读取范围、写入范围、覆盖策略、权限、风险。
- 执行动作：执行工具、取消、重试、让 Hermes 修复。
- 运行状态：等待确认、运行中、成功、失败、需要用户处理。
- 产物摘要：文件名、位置、来源 trace。
- Hermes 修复记录和修复入口。

这一层必须能同时渲染在：

- 桌面级 `ToolFloatingWindow`。
- Web fallback 的 `ToolInlinePanel`。

### 3.3 状态层

工具小窗和主工具中心必须共享同一份工具运行状态：

- 当前打开的 `tool_id`。
- 当前参数值。
- 当前运行输入。
- 当前安全确认状态。
- 当前 ToolRun 状态。
- 最近产物。
- Hermes 修复状态。
- 错误信息。

状态不应只保存在小窗本地，否则关闭或刷新后会丢失上下文。

## 4. 桌面窗口 API 草案

```ts
type ToolWindowBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ToolFloatingWindowRequest = {
  tool_id: string;
  initial_bounds?: Partial<ToolWindowBounds>;
  always_on_top?: boolean;
  focus?: boolean;
};

type ToolWindowState = {
  tool_id: string;
  is_open: boolean;
  is_focused: boolean;
  always_on_top: boolean;
  bounds: ToolWindowBounds;
};

type ToolWindowBridge = {
  openToolWindow(request: ToolFloatingWindowRequest): Promise<ToolWindowState>;
  closeToolWindow(tool_id: string): Promise<void>;
  focusToolWindow(tool_id: string): Promise<void>;
  setAlwaysOnTop(tool_id: string, value: boolean): Promise<ToolWindowState>;
  setBounds(tool_id: string, bounds: Partial<ToolWindowBounds>): Promise<ToolWindowState>;
  getToolWindowState(tool_id: string): Promise<ToolWindowState | undefined>;
};
```

第一版可以只支持一个工具小窗。后续再评估是否允许多个工具同时打开。

## 5. Web Fallback 边界

纯浏览器环境无法可靠实现真正桌面置顶，因此 Web fallback 必须明确降级：

- 可以在浏览器内展示工具小窗预览。
- 可以复用参数、安全确认、执行、Hermes 修复内容。
- 不承诺脱离浏览器。
- 不承诺置顶在 DCC 上方。
- 不承诺跨应用拖动和显示器级位置记忆。

Web fallback 的 UI 文案应避免让用户误以为它已经是最终桌面小窗。

## 6. 最小 MVP

第一阶段目标：

- 抽出 `ToolFloatingWindowContent`，让当前 Web 内窗口复用这层内容。
- 增加 `ToolWindowBridge` 接口占位。
- Web 环境下调用 `openToolWindow()` 时降级为 `ToolInlinePanel`。
- 文档和 UI 文案统一使用“工具小窗 / Floating Tool Window”。

第二阶段目标：

- 引入桌面壳。
- `openToolWindow()` 创建真实独立窗口。
- 支持 always-on-top。
- 支持拖动、缩放、关闭。
- 记住位置和尺寸。
- 工具小窗和主窗口共享工具运行状态。

第三阶段目标：

- 支持窗口跟随当前 DCC / Connector。
- 支持从 Hermes 修复事件主动唤起工具小窗。
- 支持多工具窗口策略或单窗口切换策略。
- 支持团队策略限制：某些高风险工具必须置顶显示确认。

## 7. 验收标准

桌面级工具小窗完成时，至少满足：

- 用户在工具中心点击工具后，能打开独立窗口。
- 窗口能置顶在 Maya / Blender / Unreal 上方。
- 窗口能拖动和缩放。
- 关闭后再次打开能恢复上次位置和尺寸。
- 参数修改能同步到工具运行输入。
- 执行前能展示安全确认。
- 运行失败后能在小窗中触发 Hermes 修复。
- 主窗口和工具小窗看到的运行状态一致。

## 8. 当前代码映射

当前已有实现：

- `src/modules/tool-center/ToolCenter.tsx`：包含 Web fallback 形态的工具窗口内容。
- `.tool-floating-window` / `.tool-window-*`：当前 Web fallback 样式。
- `buildSubmitTaskInputFromToolParameters()`：工具参数到运行输入的转换。

下一步代码建议：

1. 从 `ToolCenter.tsx` 中抽出 `ToolFloatingWindowContent`。
2. 新增 `src/services/toolWindowBridge.ts`，定义 `ToolWindowBridge` 和 Web fallback adapter。
3. 让 `ToolCenter` 调用 `toolWindowBridge.openToolWindow(tool.id)`。
4. Web fallback adapter 暂时仍设置 `selectedTool`，显示内嵌小窗预览。
5. 后续桌面壳接入时只替换 bridge，不重写工具内容。
