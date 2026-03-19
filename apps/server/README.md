# Server Notes

## 状态机
- `DRAFT`: 初始输入
- `COLLECTING`: 逐槽位追问
- `CONFIRMING`: 摘要确认
- `CONFIRMED`: 已入账

## 槽位字段
- `amount`
- `majorType` (`fixed|extra|income`)
- `platformTags` (array)
- `usageType` (`family|self|child|husband|other`)
- `reason`
- `occurredAt` (ISO)
