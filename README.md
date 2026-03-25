# Money App (H5 + 微信小程序)

聊天式个人语音记账应用，支持：
- 语音输入转文本
- 大模型多轮追问补全账单信息
- 用户确认后入库
- 月度/年度多维分析
- 月度/年度账单 AI 消费建议

## 技术栈
- 前端：uni-app + Vue3 + TypeScript + Pinia
- 后端：NestJS + Prisma + PostgreSQL
- AI：faster-whisper（默认 STT）+ OpenAI（对话补全/建议，STT 可回退）

## 目录
- `apps/mobile`：跨端客户端（H5/微信小程序）
- `apps/server`：API 服务
- `packages/shared`：前后端共享类型
- `PRODUCT.md`：产品文档（功能、流程、规则、接口全览）

## 快速开始
1. 安装依赖
```bash
pnpm install
```

2. 安装本地语音转写依赖（推荐）
```bash
brew install ffmpeg
python3 -m pip install faster-whisper
```

3. 配置后端环境变量
```bash
cp apps/server/.env.example apps/server/.env
```

如果语音接口出现 `413 Payload Too Large`，可在 `apps/server/.env` 调大：
```bash
HTTP_BODY_LIMIT=15mb
```

4. 初始化数据库（确保 PostgreSQL 可用）
```bash
pnpm --filter @money-app/server prisma:generate
pnpm --filter @money-app/server prisma:migrate

docker start money-app-postgres
```

5. 启动后端
```bash
pnpm dev:server
```

6. 启动前端（H5）
```bash
pnpm dev:mobile
```

## STT 切换
- 默认：`STT_PROVIDER=faster_whisper`
- 回退 OpenAI：`STT_PROVIDER=openai`（并配置 `OPENAI_API_KEY`）

## 关键接口
- `POST /v1/auth/guest`
- `POST /v1/auth/wechat`
- `POST /v1/auth/wechat/bind`
- `POST /v1/chat-ledger/start`
- `POST /v1/chat-ledger/transcribe`
- `POST /v1/chat-ledger/message`
- `POST /v1/chat-ledger/patch`
- `POST /v1/chat-ledger/confirm`
- `GET /v1/ledger`
- `GET /v1/analytics/monthly`
- `GET /v1/analytics/yearly`
- `POST /v1/ai-advice/generate`

## 说明
- 首版币种固定 `CNY`。
- 平台标签默认支持：`现金/京东/淘宝/抖音/饿了么/叮咚买菜`。
- 用户类型：微信登录 + 游客模式。
- 前端若首次构建报依赖缺失，请再次执行 `pnpm install`。
- 若前面还有 Nginx/网关，请同步放宽请求体大小（例如 `client_max_body_size`），否则仍可能返回 413。

## 安全与部署注意
- 不要提交任何 `*.env` 到仓库，密钥仅放在本地或云平台环境变量。
- 若密钥曾泄露到聊天/截图/历史记录，请立即轮换：`JWT_SECRET`、`WECHAT_APP_SECRET`、`OPENAI_API_KEY`。
- 云端部署后请手动执行数据库迁移，再启动服务。
# money_app
