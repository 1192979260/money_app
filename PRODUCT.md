# Money App 产品文档

最后更新：2026-03-20  
适用版本：当前仓库 `main`（H5 + 微信小程序 + NestJS API）

## 1. 产品概述

Money App 是一款「聊天式语音记账」产品。用户通过语音或文字输入一笔消费/收入信息，系统自动补全账单槽位，确认后入库，并提供收支分析与 AI 建议。

### 1.1 产品定位
- 面向家庭/个人日常记账场景的轻量化工具。
- 强调“低输入成本”：语音优先、追问补齐、标签快速选择。
- 强调“可复盘”：账单详情可查看当次对话历史。

### 1.2 核心价值
- 比传统表单记账更快：语音一句话即可开始。
- 比纯文本记账更准：多轮追问防止关键字段缺失。
- 比单纯流水更有用：提供月/年分析与 AI 消费建议。

## 2. 目标用户与使用场景

### 2.1 目标用户
- 需要高频记账但不愿复杂录入的用户。
- 家庭财务管理用户（关注“归属对象”：家庭/老婆/孩子/老公/其他）。
- 同时记录支出与收入并希望做周期复盘的用户。

### 2.2 典型场景
- 买菜、外卖、网购后，语音快速入账。
- 月末查看固定支出/额外支出占比和归属对象分布。
- 按月或按年生成 AI 建议，优化消费结构。

## 3. 功能范围（已实现）

## 3.1 登录与账号体系
- 游客登录：`POST /v1/auth/guest`
- 微信登录：`POST /v1/auth/wechat`（支持真实 `code2session`）
- 游客绑定微信：`POST /v1/auth/wechat/bind`
- 自动登录策略（小程序）：优先微信登录，失败回退游客模式，并记录 `authAutoMode`。
- 游客数据合并：绑定已存在微信账号时，可迁移游客历史数据并切换 token。

## 3.2 聊天记账（核心）
- 新建账单会话：`POST /v1/chat-ledger/start`
- 语音转写：`POST /v1/chat-ledger/transcribe`
  - 默认本地 `faster-whisper`
  - 失败可回退 OpenAI STT（已配置时）
- 文本对话补全：`POST /v1/chat-ledger/message`
- 快捷补丁写入（标签选择）：`POST /v1/chat-ledger/patch`
- 确认入账：`POST /v1/chat-ledger/confirm`

### 3.2.1 槽位与追问
- 关键槽位：`amount`、`majorType`、`platformTags`、`reason`、`occurredAt`、`usageType`、`needRemark`、`remark`
- 支出流程：金额/分类/平台/用途/时间/归属对象 -> 是否备注 -> 备注内容 -> 确认
- 收入流程：金额/分类(收入)/平台/收入来源/时间 -> 是否备注 -> 备注内容 -> 确认（不追问归属对象）

### 3.2.2 前端交互能力
- 文字/语音双输入模式切换。
- 语音支持 H5 `MediaRecorder` + 小程序录音器双通道降级。
- 追问环节支持快捷标签（金额/分类/平台/归属对象/用途/日期）。
- 日期采用“年-月-日下拉+确认”交互（限制到当天，不可选未来日期）。
- 备注采用弹窗二选一（需要/不需要）。
- 确认采用弹窗（再看看/确认入账）。

## 3.3 账单管理
- 列表查询：`GET /v1/ledger`
  - 维度：发生年份、发生月份、收支类型、分类、归属对象、平台、关键词
- 账单详情：`GET /v1/ledger/:id`
  - 展示账单字段 + 本次会话对话历史
- 删除账单：`DELETE /v1/ledger/:id`
- 列表端交互
  - 移动端：左滑操作（删除/取消）
  - PC/H5：右上角删除按钮 + 右键删除确认

### 3.3.1 账单页统计增强
- 当前筛选结果总金额 + 笔数汇总
- 饼图（动态维度）
  - 支出：归属对象占比 + 支出分类占比（固定/额外）
  - 收入：收入来源占比（老公/老婆/其他）

## 3.4 分析页
- 月度分析：固定支出、额外支出、总支出、月收入
- 年度分析：年收入、年固定支出、年额外支出、结余
- 归属对象统计：家庭/老婆/孩子/老公/其他
- 支持点击指标跳转到账单页并预填筛选条件

## 3.5 AI 建议页
- 周期选择：月度/年度
- 日期选择：下拉（年月或年份）
- 生成建议：`POST /v1/ai-advice/generate`

## 3.6 我的页面
- 显示当前登录身份（微信/游客）
- 游客态绑定微信入口
- 显示本地缓存状态（会话草稿/最近账单/分析快照）

## 4. 关键业务规则

## 4.1 分类与口径
- 账单大类：`fixed`（固定支出）/`extra`（额外支出）/`income`（收入）
- 列表筛选与排序口径：基于 `occurredAt`（发生时间），非 `createdAt`
- 币种固定 `CNY`

## 4.2 展示映射
- `usageType=self` 展示为“老婆”（兼容历史存储）
- 收入来源展示统一为三类：老公/老婆/其他（其余文本归入其他）

## 4.3 数据保护与纠错
- 备注阶段保护：补备注时不覆盖已确认用途/来源
- 控制词过滤：避免“确认/好的”等词误污染用途字段
- 金额污染保护：纯金额文本不写入用途字段

## 5. 信息架构与页面

底部导航 5 个主页面：
- `pages/chat/index`：语音记账
- `pages/ledger/index`：账单筛选
- `pages/analytics/index`：统计分析
- `pages/advice/index`：消费建议
- `pages/profile/index`：我的

## 6. 技术与部署概览

## 6.1 技术栈
- 前端：uni-app + Vue3 + Pinia + TypeScript
- 后端：NestJS + Prisma + PostgreSQL
- AI：
  - STT：`faster-whisper`（默认）/ OpenAI（回退）
  - 对话补全与建议：OpenAI

## 6.2 关键环境变量（后端）
- 基础：`DATABASE_URL`、`JWT_SECRET`、`HTTP_BODY_LIMIT`
- 微信：`WECHAT_APPID`、`WECHAT_APP_SECRET`、`WECHAT_CODE2SESSION_URL`
- STT：`STT_PROVIDER`、`FASTER_WHISPER_*`
- OpenAI：`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_*_MODEL`

## 6.3 部署现状
- 提供免费部署脚手架（Supabase + Render + Cloudflare Pages）
- 前端页面已部署到 Cloudflare Pages
- 后端支持容器部署，启动策略已做端口/监听兼容修复

## 7. 数据模型（业务视角）

### 7.1 用户（User）
- 支持微信身份（`wechatOpenid`）与游客设备身份（`deviceId`）

### 7.2 账单（LedgerEntry）
- 核心字段：金额、分类、平台、归属对象、用途、备注、发生时间、原文
- 支持持久化 `conversationHistory` 用于详情复盘

### 7.3 会话草稿（ConversationDraft）
- 记录当前缺失槽位、已收集槽位和会话状态（DRAFT/COLLECTING/CONFIRMING/CONFIRMED）

### 7.4 建议报告（AdviceReport）
- 记录周期参数、输入快照、建议文本

## 8. 当前产品成熟度

### 8.1 已具备
- 从“输入 -> 补全 -> 确认 -> 入库 -> 分析 -> 建议”的闭环链路
- H5 与微信小程序双端可用
- 游客到微信账号的升级与数据合并能力

### 8.2 待持续优化（方向）
- 聊天追问效率继续提升（减少无效轮次）
- 筛选与图表可视化丰富度提升
- 云端部署稳定性与运维自动化持续完善

## 9. 附录：核心接口清单（v1）

- `POST /v1/auth/guest`
- `POST /v1/auth/wechat`
- `POST /v1/auth/wechat/bind`
- `POST /v1/chat-ledger/start`
- `POST /v1/chat-ledger/transcribe`
- `POST /v1/chat-ledger/message`
- `POST /v1/chat-ledger/patch`
- `POST /v1/chat-ledger/confirm`
- `GET /v1/ledger`
- `GET /v1/ledger/:id`
- `DELETE /v1/ledger/:id`
- `GET /v1/analytics/monthly`
- `GET /v1/analytics/yearly`
- `POST /v1/ai-advice/generate`
