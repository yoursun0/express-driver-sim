# 《网约车司机模拟器》

虚构滨江市的快车班次游戏。车自动往前开，玩家听单、做决定、交班看收据。没有账号，也没有真实支付。

这是非官方同人作品，与任何出行平台及其关联公司无关。规则与价格均为模拟。

## 怎么跑

```bash
bun install
bun run dev
bun run check
bun run build
```

- `bun run dev` 本地预览
- `bun run check` 做类型检查和测试
- `bun run build` 产出静态站点到 `dist/`
- `bun run preview` 预览构建结果

进度存在浏览器的 `localStorage`，键名 `eds-v1`。刷新可以接着开。

## 这是什么，不是什么

玩家是新能源快车司机，班次有早班、晚高峰、夜班。同一班里会遇到快车、特惠和已经拼好的拼车。城市、车牌、计价和休息规则都是滨江市的模拟。

不做骑手或送货，不做专车、出租车、顺风车和跨城。不能手动转向，也不做巡游出租的承包费或港式红色计价器。

## 文档

- [docs/LOCKS.md](docs/LOCKS.md)
- [docs/SPEC-DRAFT.md](docs/SPEC-DRAFT.md)
- [docs/RESEARCH.md](docs/RESEARCH.md)
