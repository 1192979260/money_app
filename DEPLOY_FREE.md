# 免费公网部署（Supabase + Render + Cloudflare Pages）

适配当前项目：`uni-app H5` + `NestJS + Prisma + PostgreSQL`。

## 1. 创建 Supabase 免费数据库
1. 注册并创建项目。
2. 在 `Project Settings -> Database` 获取 `Connection string`。
3. 记录 `DATABASE_URL`。
4. Render 建议优先使用 Supabase Transaction Pooler 连接串（`...pooler.supabase.com:6543`）。

## 2. 部署后端到 Render（免费）
仓库已提供：
- `apps/server/Dockerfile`
- `render.yaml`

操作：
1. 在 Render 里 `New + -> Blueprint`，选择本仓库。
2. 选中 `money-app-api` 服务创建。
3. 填写环境变量：
   - `DATABASE_URL=<Supabase连接串>`
   - `JWT_SECRET=<至少32位随机串>`
   - `OPENAI_API_KEY=<你的Key>`
   - 可选：`OPENAI_BASE_URL`
   - 可选微信：`WECHAT_APPID`、`WECHAT_APP_SECRET`
4. 首次部署完成后，拿到后端域名：
   - `https://<your-api>.onrender.com`

说明：
- 该配置默认 `STT_PROVIDER=openai`，避免云端依赖 `faster-whisper + ffmpeg`。
- 容器启动命令当前仅启动服务，不再自动执行迁移。
- 首次上线或每次 schema 变更后，请手动执行一次迁移：
  - `DATABASE_URL='<你的连接串>' pnpm --filter @money-app/server exec prisma migrate deploy`

## 3. 部署前端到 Cloudflare Pages（免费）
1. 在 Cloudflare Pages 里连接本仓库。
2. Build 配置：
   - Build command: `pnpm install --frozen-lockfile && pnpm --filter @money-app/mobile build`
   - Build output directory: `apps/mobile/dist/build/h5`
3. 环境变量：
   - `VITE_API_BASE=https://<your-api>.onrender.com`
4. 部署后拿到前端公网域名（`*.pages.dev`）。

## 4. 小程序/H5回调域名设置（如需）
- 微信小程序后台把后端域名加入合法请求域名（HTTPS）。
- 如需自定义域名，Render/Cloudflare 均支持绑定并自动 HTTPS。

## 5. 上线后检查
1. 打开前端页面，能完成游客登录。
2. 新建账单并保存成功。
3. 账单列表能加载。
4. 语音转写可用（依赖 `OPENAI_API_KEY`）。
5. 最少做一次接口冒烟：
   - `POST /v1/auth/guest`
   - `POST /v1/chat-ledger/start`
   - `GET /v1/ledger`

## 6. 免费层注意事项
- Render 免费实例会休眠，首次请求有冷启动延迟。
- Supabase 免费项目有容量和活跃限制。
