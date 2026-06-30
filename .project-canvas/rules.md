# 项目架构规则

## 统一任务入口

任何功能开发必须先有 DevTask；Web 可创建任务与请求编排，改代码由 Agent 执行。

## Web 受控写口

Web 仅允许：创建任务、请求编排、用户验收、确认发布（详见 CodeCanvas rules.md）。

## 发布图是唯一事实源

编排与架构决策只读取 published.operation-map.json。

## 验证后方可完成

Agent 标记任务完成前须过构建或 canvas:verify。

## 文件协议边界

跨 Agent/Web 的状态落在 .project-canvas/ 目录。
