# AGENTS

## Project Context
- 项目：个人语音记账跨端应用（H5 + 微信小程序）
- 前端：uni-app + Vue3 + Pinia
- 后端：NestJS + Prisma + PostgreSQL
- AI：OpenAI（语音转文本 + 对话补全 + 建议生成）

## Iteration Log
### 2026-03-19 - Feature Update 1
- 完成微信 `code2session` 真实联调逻辑：
  - 使用真实接口 `https://api.weixin.qq.com/sns/jscode2session`
  - 支持 `WECHAT_CODE2SESSION_URL` 覆盖，便于联调/代理
  - 增加 `errcode/errmsg` 识别与日志输出
  - 增加配置缺失、HTTP 异常、网络异常兜底
- 新增后端测试：
  - `apps/server/test/auth.service.spec.ts`
  - 覆盖成功登录与微信错误码失败场景
- 环境变量更新：
  - `apps/server/.env.example` 新增 `WECHAT_CODE2SESSION_URL`

### 2026-03-19 - Feature Update 2
- 完成 H5 语音录制兼容降级：
  - `apps/mobile/src/components/VoiceButton.vue` 新增 `MediaRecorder` 录音流程
  - H5 场景优先使用 `navigator.mediaDevices.getUserMedia + MediaRecorder`
  - 录音完成后将 Blob 转 base64，复用既有上传接口
  - 当 H5 API 不可用时，自动回退到 uni 录音器逻辑
  - 增加录音读取/转换失败提示，避免静默失败
- 验证：
  - `pnpm --filter @money-app/mobile build` 已通过

### 2026-03-19 - Feature Update 3
- 完成“微信账号绑定 + 游客数据合并”流程：
  - 后端新增 `POST /v1/auth/wechat/bind`（需 JWT）
  - 当微信账号不存在时：当前游客账号直接绑定 `wechatOpenid`
  - 当微信账号已存在且非当前用户时：
    - 将游客用户的 `ledgerEntry / conversationDraft / adviceReport` 全量迁移到微信用户
    - 迁移后删除游客用户，返回微信用户新 token
- 前端“我的”页接入绑定入口：
  - 游客模式显示“绑定微信账号”按钮
  - 通过 `uni.login({ provider: 'weixin' })` 获取 code 并调用绑定接口
  - 绑定成功后本地用户态切换为 `wechat`
- 测试与验证：
  - `apps/server/test/auth.service.spec.ts` 新增绑定直连和合并迁移场景
  - `pnpm --filter @money-app/server test` 通过
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 4
- 完成微信小程序端“自动微信登录 + 失败回退游客”策略：
  - `useUserStore.ensureLogin()` 在 `mp-weixin` 环境优先尝试：
    1. `uni.login` 获取 code
    2. 调用 `/v1/auth/wechat` 自动登录
  - 若任一步失败，自动回退 `/v1/auth/guest`
  - 将自动登录结果写入 `authAutoMode`（`wechat` / `guest_fallback`）用于页面提示与排障
- 登录能力统一收敛到 `auth` service：
  - 新增 `loginWechat(code)`
  - 新增 `getWechatCode()`，页面与 store 复用，减少重复逻辑
- “我的”页体验优化：
  - 游客态显示自动登录回退提示
  - 绑定微信按钮复用 `getWechatCode + bindWechat` 流程
- 验证：
  - `pnpm --filter @money-app/server test` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 5
- 完成“备注追问”对话流程：
  - 在必填槽位中新增 `needRemark`（是否需要备注）
  - 当用户选择需要备注时，再追问 `remark` 内容
  - 追问文案新增：`是否需要记录账单备注？（需要/不需要）`
- 入库与展示：
  - `LedgerEntry` 新增可空字段 `note`
  - 确认入账时将 `remark -> note` 持久化
  - 账单列表页新增“备注：xxx/无”展示
- 解析与模型抽取：
  - 规则抽取支持识别“需要/不需要备注”与“备注: xxx”
  - LLM 槽位抽取提示增加 `needRemark(boolean)` 与 `remark(string)`
- 数据库与验证：
  - 新迁移：`20260319061549_add_note_remark`
  - `pnpm --filter @money-app/server test` 通过
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 6
- 完成“备注询问弹窗化”交互：
  - 聊天页在缺失槽位包含 `needRemark` 时展示弹窗
  - 用户可直接点选“需要 / 不需要”，无需手动输入
  - 点击后通过 `quickPatch` 写入会话，并保留用户消息气泡
- 平台分类扩展：
  - 默认平台标签新增：`饿了么`、`叮咚买菜`
  - 规则抽取平台候选同步扩展
  - 平台追问文案同步更新
- 验证：
  - `pnpm --filter @money-app/server test` 通过
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 7
- 语音转写切换为开源本地方案（默认）：
  - 后端 `STT_PROVIDER` 默认改为 `faster_whisper`
  - 新增 Python 脚本：`apps/server/scripts/faster_whisper_transcribe.py`
  - Nest 服务通过子进程调用脚本完成转写，并自动清理临时音频文件
- 回退策略：
  - 当 `faster-whisper` 失败时，自动回退 OpenAI STT（若配置了 `OPENAI_API_KEY`）
  - 若两者都不可用，返回明确的配置提示
- 配置与文档：
  - `apps/server/.env.example` 新增 `STT_PROVIDER` 与 `FASTER_WHISPER_*` 配置
  - `README.md` 补充 `ffmpeg + faster-whisper` 安装与 STT 切换说明
- 验证：
  - `pnpm --filter @money-app/server test` 通过
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 8
- 完成整体 UI 重构为“马卡龙扁平化”风格：
  - 统一主题变量、卡片样式、按钮风格
  - 页面底色改为马卡龙渐变，弱化玻璃拟态，突出扁平化
- 底部导航重做：
  - 移除原生 tabBar，新增自定义 `AppTabBar` 组件
  - 字号放大并增加 icon（💬/📒/📊/🧠/👤）
  - 全页面统一底部固定导航，提升可读性
- 聊天页优化：
  - 输入框改为胶囊结构（输入区 + 发送按钮）
  - 修复气泡横向溢出：增加 `word-break/overflow-wrap/white-space` 处理
  - 头部信息卡与弹窗样式统一
- 枚举中文化与时间格式化：
  - 后端确认摘要中大分类/用处改为中文
  - 时间统一格式化为 `YYYY-MM-DD HH:mm`
  - 账单页展示侧也改为中文映射
- 各 tab 页面视觉升级：
  - 账单、分析、建议、我的页面均增加信息头卡、层次化内容卡与一致间距系统
- 验证：
  - `pnpm --filter @money-app/server test` 通过
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 9
- 修复聊天页布局溢出与底部遮挡问题：
  - 聊天页容器改为 `height: 100vh + overflow: hidden`，聊天区独立滚动
  - 输入区增加底部安全避让：`margin-bottom: safe-area + tabbar-height`
  - 底部导航层级提升，输入区与导航不再互相遮挡
- 修复横向超出：
  - 全局 `page/app-root` 增加 `overflow-x: hidden`
  - 聊天气泡文本增加 `overflow-wrap/word-break/white-space` 约束
- 底部导航尺寸微调：
  - 减小导航卡高度与间距，提升可视区域
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 10
- 聊天输入区重构为“微信式”现代布局：
  - 支持文字/语音双模式切换（左侧模式按钮）
  - 文本模式：中间圆角输入栏 + 右侧发送按钮
  - 语音模式：整行“按住说话”按钮（更大触控面积）
- 语音按钮组件升级：
  - `VoiceButton` 新增 `block` 模式，支持全宽语音操作样式
  - 统一为扁平化视觉风格，减少突兀渐变
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 11
- 修复聊天页输入框被底部菜单遮挡：
  - 页面主布局改为三段式 `header / chat(1fr) / input`
  - `chat-list` 固定占据中间可滚动区域（`minmax(0, 1fr)`）
  - 移除输入区 `margin-bottom` 方案，改为页面统一底部预留 `safe-area + tabbar` 空间
- 结果：输入区始终位于底部导航上方，聊天区在中间稳定伸缩
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 12
- 修复 H5 首页“整体 body 跟随滚动”问题：
  - 全局锁定滚动容器：`html/body/#app/uni-page-body` 全部 `overflow: hidden`
  - `page` 与 `.app-root` 增加纵向隐藏，禁止页面级滚动
  - 聊天页增加 `overscroll-behavior: none`，避免边界回弹触发外层滚动
- 结果：仅聊天中间 `scroll-view` 可滚动，页面整体不再滚动
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

## Next Pending
- 聊天页增加“平台快捷标签选择”弹窗（多选），进一步减少手输

### 2026-03-19 - Feature Update 13
- 再次修复首页输入区被 tab 导航遮挡：
  - 输入区改为 `position: fixed`，固定在 tabbar 上方（`bottom: safe-area + 118rpx`）
  - 页面网格由三段改为两段（header + chat），避免输入区参与流式布局导致挤压
  - 聊天滚动区增加底部占位（`padding-bottom: 300rpx`），防止最后几条消息被输入区挡住
- 结果：输入框与“按住说话”区域始终可见，不再被导航覆盖
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

## Next Pending
- 聊天页增加“平台快捷标签选择”弹窗（多选），进一步减少手输

### 2026-03-19 - Feature Update 14
- 修复语音入口报错 `auth/guest net::ERR_CONNECTION_REFUSED`：
  - 前端 API 基地址不再写死 `localhost`，改为动态解析：
    1) `uni.getStorageSync('apiBase')`
    2) `VITE_API_BASE`
    3) 当前页面域名 + `:3000`
  - 后端服务重新拉起并验证 `POST /v1/auth/guest` 可用
  - H5 开发服务重启为 `--host 0.0.0.0` 监听，确保手机可访问
- 验证：
  - `curl POST /v1/auth/guest` 返回 token 成功
  - H5 Network 地址：`http://172.17.20.44:5173/`

## Next Pending
- 聊天页增加“平台快捷标签选择”弹窗（多选），进一步减少手输

### 2026-03-19 - Feature Update 15
- 处理网页端“长按说话”可用性：
  - `VoiceButton` 新增鼠标事件支持：`mousedown / mouseup / mouseleave`
  - 保留触摸事件：`touchstart / touchend / touchcancel`
  - 统一按压状态机，避免重复触发开始/结束
  - 按压时按钮文案动态切换为“松开结束”
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 16
- 聊天页滚动体验优化：
  - 聊天列表改为 `scroll-into-view` 自动定位到最后一条消息
  - 初始化与每次新增消息都会自动滚动到底部
- 完成“确认即归档 + 清空会话”：
  - `confirm` 请求新增 `conversationHistory` 传参
  - 后端确认入账时将本次对话历史持久化到 `LedgerEntry.conversationHistory`
  - 确认成功后前端清空当前聊天态（`draftId/messages/chatSnapshot`）
- 账单详情支持查看对话历史：
  - 后端新增 `GET /v1/ledger/:id`
  - 前端账单列表项支持点击跳转详情页
  - 新增页面 `pages/ledger/detail`，展示账单信息与本次对话气泡
- 数据库变更：
  - 新迁移：`20260319160500_add_conversation_history`
- 验证：
  - `pnpm --filter @money-app/server prisma:generate` 通过
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 17
- 聊天页语音交互调整：
  - 语音转写成功后不再仅回填输入框，改为直接调用文本发送流程
  - 结果：语音结束后会立即触发会话接口并返回 assistant 追问
- 新增“新建账单”快捷问询入口：
  - 后端新增 `POST /v1/chat-ledger/start`，创建空草稿并返回首个追问
  - 前端聊天页头部新增“新建账单”按钮，一键发起问询会话
- 验证：
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 18
- 聊天确认交互调整：
  - 移除聊天输入区“确认入账”按钮
  - 当状态进入 `CONFIRMING` 时改为弹窗确认（再看看 / 确认入账）
- 追问交互改造为标签选择（备注内容除外）：
  - 缺失槽位为 `amount/majorType/platformTags/usageType/reason/occurredAt` 时展示快捷标签
  - 平台支持多选标签并单独“确认平台选择”
  - `needRemark` 继续使用“需要 / 不需要”弹窗选择
  - `remark` 仍保留文本输入
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 19
- 修复“用途被误识别为确认”问题：
  - 规则抽取层新增用途有效性校验，过滤控制词（如：确认、确认入账、好的、需要/不需要等）
  - 槽位合并层增加二次保护：若新 `reason` 为控制词，则保留原有有效用途
- 结果：
  - 确认操作不会再污染账单用途字段
- 验证：
  - `pnpm --filter @money-app/server build` 通过

### 2026-03-19 - Feature Update 20
- 修复账单详情页不可滚动：
  - 详情页主容器改为 `height: 100vh`
  - 内容改为内部 `scroll-view` 纵向滚动
- 账单列表新增删除能力：
  - 后端新增 `DELETE /v1/ledger/:id`
  - 前端账单列表支持左滑露出删除按钮
  - H5 支持右键卡片触发删除确认（并保留长按删除）
- 验证：
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 21
- 修复账单页滚动与删除交互：
  - 账单列表页改为三段式固定布局，`scroll-view` 占据剩余高度并增加底部安全区，解决“无法滚动到底部”
  - 左滑删除补充 H5 鼠标拖拽支持（`mousedown/mouseup/mouseleave`）
  - 右键行为改为“展开删除按钮”而非直接弹窗，便于可视化确认
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 22
- 账单页交互再次修正（H5）：
  - 账单列表布局从 grid 调整为 `flex column`，`scroll-view` 使用 `flex: 1`，修复滚动到底部不稳定
  - 鼠标左滑支持从 `mousedown+mouseup` 升级为 `mousedown+mousemove+mouseup` 连续判定，提升网页端左滑可用性
  - 右键改回直接弹出删除确认，避免“右键无删除入口”歧义
- 账单详情页滚动稳态优化：
  - 页面改为 `flex column`，内部 `scroll-view` 使用 `flex: 1`，增强可滚动兼容性
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 23
- 聊天页平台选择与遮挡修复：
  - 平台追问从“多选+确认”调整为“单选即提交”
  - 选中平台后立即 `quickPatch`，减少一步点击
  - 聊天列表底部留白改为动态：当标签面板出现时自动增大 `padding-bottom`，避免底部消息被输入区遮挡
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 24
- 聊天发送按钮视觉优化：
  - 文案“发送”改为图标按钮（纸飞机样式）
  - 调整按钮底色、阴影与图标对齐，提升按钮辨识度与美观度
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 25
- 聊天发送按钮圆形化：
  - 发送按钮改为等宽高 `78rpx x 78rpx`
  - 圆角改为 `border-radius: 50%`
  - 输入行网格第三列同步收敛到 `78rpx`
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 26
- 账单详情页增强：
  - 新增“删除”按钮（详情页可直接删除当前账单）
  - 增加滚动尾部占位，修复详情页无法拉到底导致历史底部被遮挡
- 收支分析增强：
  - 新增“用处统计”模块（家庭/本人/孩子/老公/其他）
  - 各统计值支持点击跳转到账单列表并预填筛选条件
- 账单列表筛选增强：
  - 新增筛选维度：月份、用处、平台、关键词
  - 支持年月联动筛选（年+月）
  - 支持从分析页携带筛选预填（含 majorType / usageType / year / month）
- 后端能力增强：
  - `analytics` 返回 `usageStats`
  - `ledger` 列表新增 `keyword` 查询（匹配用途/备注/原文）
- 验证：
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 27
- 账单筛选控件改造为下拉选择：
  - 年份改为下拉（从当前年倒序到 2026 年）
  - 月份改为下拉（全部 + 1-12 月）
  - 平台改为下拉（全部 + 常用平台）
- 保留并兼容其他筛选维度（分类/用处/关键词）
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 28
- 建议页日期筛选改造为下拉：
  - 月度模式：日期下拉为“年月”选项（YYYY-MM）
  - 年度模式：日期下拉为“年份”选项（当前年倒序至 2026）
  - 移除手输日期输入框，统一使用 picker 选择
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 29
- 账单列表删除交互分端优化：
  - PC 端：卡片右上角固定显示“删除”按钮，不依赖左滑
  - 移动端：保留左滑删除，但删除红底层仅在展开状态显示，修复红边外露
  - PC 端右键菜单仍可直接触发删除确认
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 30
- 修复账单左滑删除层级问题：
  - 左滑展开时提高删除按钮层级（`z-index`），确保按钮显示在卡片上层
  - 左移卡片层级下调，避免删除按钮被压在底部
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 31
- 账单左滑操作区增强：
  - 左滑展开后操作区改为双按钮：`删除` + `取消`
  - 两个按钮上下排列（竖向并排）
  - 点击“取消”仅收起操作区，不触发删除
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 32
- 视觉统一优化：
  - 全局 `glass-card` 圆角统一为 `16rpx`
  - 与下拉框圆角保持一致，减小 section 卡片“过圆”观感
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 33
- 修复“用途字段被金额污染”问题：
  - 规则抽取增加 `reason` 有效性约束：纯金额/金额短句/纯平台词不再视为用途
  - 槽位合并增加保护：若 `reason` 与 `amount` 文本等价（如 `28` / `28元`），回退为原有用途
- 验证：
  - `pnpm --filter @money-app/server build` 通过

### 2026-03-19 - Feature Update 34
- 修复“新建账单即弹备注”流程问题：
  - 备注弹窗触发条件改为 `currentSlot === needRemark`，不再仅按 `missingSlots` 包含判断
  - 新建账单后将按顺序从金额开始追问
- 确认取消后的备注回问：
  - 在确认弹窗点击“再看看”后，强制再次询问“是否需要备注”
  - 选择“不需要”后继续确认流程；选择“需要”后进入备注输入再确认
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 35
- 修复备注追问循环问题：
  - 后端文本处理增加“槽位感知兜底”
  - 当当前缺失槽位为 `remark` 时，用户输入文本将直接写入备注（无需必须匹配“备注: xxx”格式）
  - 结果：补充备注后可正常进入确认弹窗，不再反复询问备注
- 验证：
  - `pnpm --filter @money-app/server build` 通过

### 2026-03-19 - Feature Update 36
- 修复“取消确认后改选需要备注仍直接确认”问题：
  - 备注选择“需要”时，前端改为 `quickPatch({ needRemark: true, remark: '' })`
  - 强制进入备注内容追问，再进入确认弹窗
  - 备注选择“不需要”时，才直接回到确认流程
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 37
- 修复“取消确认后选择不需要备注未回到确认弹窗”问题：
  - 在备注选择回调中，`quickPatch` 完成后显式按当前状态同步确认弹窗可见性
  - 当状态已是 `CONFIRMING` 且用户选择“不需要备注”时，立即继续展示“确认入账”弹窗
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 38
- 聊天列表滚动条隐藏：
  - 聊天页 `scroll-view` 增加滚动条隐藏样式（`scrollbar-width: none`、`::-webkit-scrollbar { display: none }`）
  - 补充 uni 容器层滚动条隐藏选择器，确保 H5 端不显示滚动条但仍可正常滚动
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 39
- 修复账单列表“滚动不到底部被 tab 遮挡”问题：
  - 将底部避让改为滚动内容内尾部占位（`scroll-tail`）
  - 账单列表 `scroll-view` 末尾新增占位区，高度为 `safe-area + 180rpx`
  - 结果：最后一条账单可稳定滚到 tab 上方完整可见
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 40
- 聊天追问“发生时间”改造为年月日下拉：
  - `occurredAt` 槽位改为年/月/日三个下拉选择 + “确认日期”按钮
  - 日期范围限制为 `2026-01-01` 到当天，默认选中当天
- 账单列表时间展示增强：
  - 卡片中新增双时间展示：`发生时间(occurredAt)` 与 `入账时间(createdAt)`
  - 筛选文案明确为“发生年份 / 发生月份”，避免与入账时间混淆
- 筛选口径确认：
  - 后端列表筛选与排序继续基于 `occurredAt`（发生时间），非 `createdAt`
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 41
- 账单筛选结果新增总金额汇总：
  - 在筛选区下方新增汇总卡片，展示“筛选总金额 + 结果笔数”
  - 金额基于当前筛选结果列表实时求和，随筛选和删除即时更新
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 42
- 账单筛选新增“收支类型”维度：
  - 新增 `flowType` 查询参数（`income` / `expense`）
  - 后端按类型过滤：收入仅 `income`，支出为 `fixed + extra`
  - 前端筛选组合按类型切换：收入模式隐藏支出分类项，关键词提示改为“收入来源/备注/原文”
- 账单筛选结果新增“归属对象占比”饼图：
  - 在账单页新增筛选结果统计饼图（家庭/老婆/孩子/老公/其他）
  - 饼图与图例基于当前筛选结果实时计算占比和金额
- `self` 语义展示统一：
  - 展示层将 `self` 统一文案为“老婆”（保留 `self` 存储值兼容历史数据）
  - 覆盖账单列表、账单详情、分析页、聊天标签选项与默认 usage 文案
- 聊天收入追问优化：
  - 收入场景在 `reason` 槽位改为“收入来源”文案
  - 快捷选项改为：`老公 / 老婆 / 其他`
- 验证：
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 43
- 账单列表筛选区改为“顶部固定 + 可展开/收起”：
  - 筛选区改为折叠面板，默认收起
  - 收起状态展示当前筛选摘要（收支类型、年月、分类、归属对象、平台、关键词）
  - 点击“展开”后显示完整筛选项与筛选按钮，支持再次“收起”
- 交互结果：
  - 筛选项始终固定在账单页顶部，不随列表滚动
  - 保持账单列表滚动区域稳定
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 44
- 收入记账追问流程调整：
  - 后端缺失槽位规则改为：当 `majorType=income` 时不再要求 `usageType`
  - 结果：收入类型账单不再追问“归属对象”，仅追问“收入来源”
- 收入入库兼容：
  - 入账时对收入单自动按“收入来源(reason)”推导 `usageType`：
    - 老公 -> `husband`
    - 老婆/本人 -> `self`
    - 其他 -> `other`
  - 保持数据库字段完整兼容，不新增迁移
- 确认摘要优化：
  - 收入账单确认文案不再展示“归属对象”字段
  - 支出账单保持原有“归属对象”展示
- 验证：
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 45
- 聊天“用途”快捷标签新增“教育”：
  - 支出场景用途选项增加 `教育`（入库值：`教育支出`）
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 46
- 账单筛选饼图维度动态切换：
  - 当筛选为“支出”时：饼图按“归属对象（家庭/老婆/孩子/老公/其他）”统计
  - 当筛选为“收入”时：饼图按“收入来源（老公/老婆/其他）”统计
  - 饼图标题随筛选类型动态变化
- 收入来源统计口径：
  - `reason=老公` -> 老公
  - `reason=老婆/本人` -> 老婆
  - 其他来源文本 -> 其他
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 47
- 账单列表卡片收入展示优化：
  - 当账单类型为收入时，卡片改为展示“来源”而非“归属对象”
  - 收入卡片中“来源”仅展示一次，避免与用途字段重复
  - 支出卡片保持“归属对象 + 用途”展示
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 48
- 收入来源展示与统计口径修正：
  - 收入卡片“来源”统一按 `reason` 映射为三类展示：`老公 / 老婆 / 其他`
  - 收入筛选饼图改为固定三类来源占比，不再把 `年终奖` 等原始文本作为独立来源选项
  - 映射规则：`老公 -> 老公`，`老婆/本人 -> 老婆`，其余 -> 其他
- 同步修复构建：
  - 补回后端 `UsageType` 类型引用，恢复 `ledger` 服务构建通过
- 验证：
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 49
- 修复“备注阶段覆盖收入来源/用途(reason)”问题：
  - 在会话处理中增加备注阶段保护逻辑
  - 当当前缺失槽位为 `needRemark` 或 `remark` 时，若已有 `reason`，则锁定并保留原值
  - 结果：补充备注文本（如“年终奖”）不会再改写已确认的来源/用途
- 验证：
  - `pnpm --filter @money-app/server build` 通过

### 2026-03-19 - Feature Update 50
- 修复支出流程“归属对象被跳过”问题：
  - 在槽位合并中新增 `usageType` 写入保护
  - 仅在以下场景才接受并写入 `usageType`：
    1) 当前缺失槽位就是 `usageType`
    2) 用户消息明确包含归属对象关键词（家庭/老婆/本人/孩子/老公/其他）
  - 结果：避免模型提前误填 `usageType` 导致支出流程跳过“归属对象”追问
- 验证：
  - `pnpm --filter @money-app/server build` 通过

### 2026-03-19 - Feature Update 51
- 修正支出追问顺序：
  - 缺失槽位顺序调整为先收集业务信息，再询问备注
  - 支出场景顺序为：金额/分类/平台/用途/时间/归属对象 -> 是否备注 -> 备注内容
  - 收入场景继续不询问归属对象
- 结果：不会再出现“先问备注、后问归属对象”的反序问题
- 验证：
  - `pnpm --filter @money-app/server build` 通过

### 2026-03-19 - Feature Update 52
- 新增免费公网部署脚手架：
  - 新增后端容器构建文件：`apps/server/Dockerfile`
  - 新增 Render Blueprint 配置：`render.yaml`
  - 新增部署操作文档：`DEPLOY_FREE.md`（Supabase + Render + Cloudflare Pages）
- 部署策略：
  - 后端容器启动时自动执行 `prisma migrate deploy`
  - 云端 STT 默认使用 OpenAI（`STT_PROVIDER=openai`），避免依赖本地 `faster-whisper`
- 验证：
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 53
- 完成 Cloudflare Pages 前端首发与二次发布：
  - 新建项目：`money-app-h5`
  - 采用“静态文件上传”方式部署（绕过 GitHub 集成拉取异常）
  - 页面地址：`https://money-app-h5.pages.dev`
  - 二次发布时使用 `VITE_API_BASE=https://money-app-api-fi9k.onrender.com` 重新构建并覆盖发布
- 修复 Render 后端部署失败：
  - 根据 Render 日志定位 Prisma 报错：容器缺少 OpenSSL，`prisma migrate deploy` 失败
  - 更新 `apps/server/Dockerfile`，增加 `openssl` 安装步骤
- 验证：
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-19 - Feature Update 54
- 修复 Render 云端端口监听问题：
  - 后端启动改为优先监听 `process.env.PORT`，本地兜底 `3000`
  - 文件：`apps/server/src/main.ts`
- 修复 Supabase 连接策略：
  - Render `DATABASE_URL` 改为 Supabase Transaction Pooler（`aws-0-us-west-2.pooler.supabase.com:6543`）
  - 部署日志确认 Prisma 已使用 pooler 地址连接
- 验证：
  - `pnpm --filter @money-app/server build` 通过

### 2026-03-19 - Feature Update 55
- 修复 Render 启动阶段“无开放端口”问题：
  - 定位原因为容器启动命令中的 `prisma migrate deploy` 在 Supabase pooler 场景阻塞，服务未进入监听阶段
  - 调整 `apps/server/Dockerfile` 启动命令为仅启动服务进程：`node apps/server/dist/apps/server/src/main.js`
- 说明：
  - 数据库迁移改为独立手动执行（避免在 Web 进程启动链路阻塞）

### 2026-03-20 - Feature Update 56
- 账单列表筛选与图表优化：
  - “分类”筛选项移除“收入”，仅保留：`全部 / 固定支出 / 额外支出`
  - 收入仍通过“收支类型”筛选切换，不再在“分类”中重复出现
- 新增支出分类占比饼图：
  - 当“收支类型=支出”时，新增“支出分类占比（按筛选结果）”饼图
  - 统计口径：`固定支出(fixed)` 与 `额外支出(extra)` 两类金额占比
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过

### 2026-03-20 - Feature Update 57
- 启动与连通性稳定性优化：
  - 后端启动入口统一修正为 `dist/apps/server/src/main.js`，避免 `dist/main` 找不到导致启动失败
  - `main.ts` 显式监听 `HOST`（默认 `0.0.0.0`），提升本地与容器环境可达性
- 部署与文档一致性修正：
  - `README.md` 更新聊天接口清单（补充 `start/transcribe`，移除过期 `voice`）
  - `DEPLOY_FREE.md` 更新为“迁移手动执行”策略，并补充 Supabase pooler 建议与冒烟检查项
  - `README.md` 新增密钥与环境变量安全提示（禁提交 `.env`、泄露后立即轮换）
- 新增接口冒烟脚本：
  - 新增 `scripts/smoke-api.sh`，覆盖 `auth/guest`、`chat-ledger/start`、`ledger`
  - 根脚本新增 `pnpm smoke:api` 命令
- 验证：
  - `pnpm --filter @money-app/server build` 通过
  - `pnpm smoke:api` 通过

### 2026-03-20 - Feature Update 58
- 开发环境账号一致性优化：
  - `loginGuest` 新增开发环境 `deviceId` 锁定逻辑
  - 开发态默认固定为 `dev-1773970839136-dkshf7`，确保本地与线上游客账号一致
  - 支持通过 `VITE_DEV_DEVICE_ID` 覆盖默认值
- H5 本地访问稳定性优化：
  - `dev:h5` 启动参数新增 `--host 0.0.0.0`，避免仅本地回环监听导致 `localhost:5173` 不可达
- 验证：
  - 重启前后端后，`localhost:5173` 可访问

### 2026-03-20 - Feature Update 59
- 修复“选择当日仍提示日期超出范围”问题：
  - 聊天页日期确认逻辑由“具体时间点比较”改为“仅按日期比较”
  - 之前使用 `12:00` 与当前时刻比较，导致当天上午会被误判为未来时间
  - 现改为 `selectedDateOnly <= todayOnly`，当天任意时段均可正常确认
- 验证：
  - `pnpm --filter @money-app/mobile build` 通过
