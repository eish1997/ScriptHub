# 设计系统

## 0. 文档控制

- 版本：v0.2
- 状态：Draft
- 用途：定义本文件的职责、范围与使用方式
- 适用对象：产品、设计、研发、测试、运维
- 单一来源：本文件
- 规范等级：MUST / SHOULD / MAY



## 1. 目标

统一前端语言，避免页面越来越多后风格散掉。

## 2. 设计原则

- 桌面优先
- 控制台优先
- 高信息密度但不拥挤
- 状态必须可见
- 风险必须显式

## 3. 基础规范

### 3.1 字体

- 标题、正文、注释、代码、数字分别定义层级

### 3.2 间距

- 统一使用固定间距尺度
- 卡片、面板、列表保持一致的垂直节奏

### 3.3 颜色

- 成功、警告、错误、信息、中性五类语义色
- 风险颜色与审批状态颜色分开

## 4. 组件目录

- Task Card
- Approval Drawer
- Trace Row
- Asset Card
- Connector Status Chip
- Error Banner
- Workflow Node
- Run Timeline
- Preview Panel
- Empty State Block

## 5. 组件状态

每个组件至少定义：

- default
- hover
- active
- disabled
- loading
- error
- read only

## 6. 推荐补充

- 栅格系统
- 图标规范
- 表格规范
- 时间线规范
- 状态徽标规范
- 抽屉与弹窗规范

## 7. 布局规则

### 7.1 桌面布局

- 顶部用于全局状态和快速操作
- 左侧用于导航或任务列表
- 中部用于主要操作
- 右侧用于详情、审批、审查信息
- 底部用于状态和运行反馈

### 7.2 面板规则

- 主面板只能有一个
- 详情面板可跟随主面板变化
- 审批面板必须保持显式

## 8. 语义状态

- 成功 = 可完成但已结束
- 警告 = 需要注意但不阻断
- 错误 = 需要处理或恢复
- 风险 = 需要确认或审批

## 9. 建议补充组件状态

- Table Empty State
- Task Status Chip
- Trace Event Row
- Approval Summary Card
- Connector Health Tile


