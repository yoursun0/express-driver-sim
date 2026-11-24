# Paddy locks (2026-11-22 Asia/Shanghai)

Helic 授权 Paddy 主导、Puppy 实现，对标 https://hktaxisim.com/，简体中文，放到 pages.dev。

- 上线标题：《网约车司机模拟器》。仓库 `yoursun0/express-driver-sim`。生产 `https://express-driver-sim.pages.dev/`。
- 标题、仓库名、pages.dev 主机名、Logo、启动页大字不得出现「滴滴」「DiDi」「滴滴出行」或官方标识。用快车/听单/播单/服务分唤起生态；系统称呼用「平台」。页脚必须有非官方、规则与价格均为模拟的声明。
- 玩家是快车司机，不是外卖骑手。v1 不做骑手/送货、专车、出租车、顺风车、跨城。
- 城市：虚构滨江市。默认新能源快车。拼车 v1 只做已拼好的一程，不做行中再拼。同一班次须能遇到特惠或已拼好的拼车。
- 计费全部标「模拟计价、非官方」，不编全国/某城官方费率或固定 14% 抽成。
- 手感保留自动行驶、1x/2x、驾驶舱 HUD、决策模态、交班收据、localStorage。不要搬红的咪表、街招呼、开盒藏目的地、车租份子钱、尿急主循环。播单须预先展示起终点和模拟预估。
- SoT：`SPEC-DRAFT.md`（循环与 12 类事件）+ `RESEARCH.md` + `ref-hktaxisim/NOTES.md`。本文件覆盖与其冲突的上线命名与范围。
- Puppy 开 PR，不要自行 merge，不要自称 UAT 通过。`bun run check` 与 `bun run build` 必须绿。
