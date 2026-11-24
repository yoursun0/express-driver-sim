# Task: implement v1 《网约车司机模拟器》 from zero

You are implementing a static web game in this repo:

- Path: `/workspace/IT/express-driver-sim`
- GitHub: `yoursun0/express-driver-sim`
- Branch: `agent/puppy/v1` (already checked out from a clean main)
- Production host (do not deploy yourself): `https://express-driver-sim.pages.dev/`

A previous 2026-11-22 attempt failed and left no repo. Start from zero in this working tree. Main currently has only the GitHub-generated README; you will add the full project on this branch.

## First message back

At the very start, report your **Grok Build weekly limit remaining (%)** from the TUI footer or `/usage`. One line is enough, then begin work. Also report the remaining % at the end.

## Read first (do not contradict; LOCKS wins on conflict)

Read all of these before writing code:

- `docs/LOCKS.md` — hard locks; wins on any conflict
- `docs/SPEC-DRAFT.md` — player loop, HUD, 12 event types, success criteria
- `docs/RESEARCH.md` — qualitative facts, fee *structure*, event sources
- `docs/ref-hktaxisim/NOTES.md` — feel of the Hong Kong Taxi Simulator

Then **look at** these reference screenshots (box paths, do not commit them):

- `/workspace/didi-taxi-sim/ref-hktaxisim/01-title.png`
- `/workspace/didi-taxi-sim/ref-hktaxisim/02-title-start-options.png`
- `/workspace/didi-taxi-sim/ref-hktaxisim/05-hud-in-shift.png` (especially)
- `/workspace/didi-taxi-sim/ref-hktaxisim/07-passenger-accept.png`
- `/workspace/didi-taxi-sim/ref-hktaxisim/14-hud-in-trip-meter.png` (especially)
- `/workspace/didi-taxi-sim/ref-hktaxisim/17-passenger-accept-endshift-timer.png`
- `/workspace/didi-taxi-sim/ref-hktaxisim/18-end-of-shift-summary.png` (especially)
- `/workspace/didi-taxi-sim/ref-hktaxisim/19-end-of-shift-summary-bottom.png`
- `/workspace/didi-taxi-sim/ref-hktaxisim/20-end-of-shift-trip-log.png`

Copy the *feel*: auto-drive + decision modals + dense cockpit HUD + end-of-shift receipt over a dimmed cabin. Do **not** copy HK taxi content.

## Hard locks (must not violate)

1. Live title: **《网约车司机模拟器》**. Package / repo name: `express-driver-sim`.
2. Title, repo name, pages.dev hostname, logo, and start-screen large type must **NOT** contain `滴滴`, `DiDi`, `didi`, `滴滴出行`, or official marks. Evoke the ecosystem with 快车 / 听单 / 播单 / 服务分. The system is called **「平台」**. Prefer footer wording like「非官方同人作品，与任何出行平台及其关联公司无关。规则与价格均为模拟。」Do not put 滴滴 / DiDi in any player-facing string (including footer, alt text, aria-labels, og tags, document title). RESEARCH.md discusses trademarks — that is research, not copy to paste into the UI.
3. Player is an express-car (快车) driver, **not** a food courier. v1: no 骑手/送货, no 专车, no taxi, no 顺风车, no intercity.
4. City: fictional **滨江市**. Default vehicle: new-energy 快车. Carpool in v1 is only a **pre-pooled** trip, not mid-trip re-pooling. The **same shift must be able to encounter 特惠 and a pre-pooled 拼车**.
5. All pricing labeled **「模拟计价、非官方」**. Do not invent official city rates or a fixed **14%** commission. Commission should vary (sometimes low or even negative), shown as 乘客实付 / 司机收入 / 平台抽成 / 奖励 if any.
6. Feel: **auto-drive (NO manual steering, no WASD, no mouse-steer)**, 1x/2x time, cockpit HUD, decision modals (2–4 options), end-of-shift receipt, `localStorage`. Dispatch cards must show **origin, destination, and a simulated estimate up front**. No red HK taximeter, no street hails, no 开盒 hidden destination, no 车租/份子钱, no bladder-as-main-loop.
7. **Simplified Chinese only** for v1. No language switcher.
8. No account, no backend, no real payments, no official SDK, logos, or brand fonts.
9. Stack: Vite + TypeScript + bun static site. Scripts: `bun run check` (tsc --noEmit && bun test) and `bun run build` must be green.
10. Implement the full loop in SPEC-DRAFT.md and **all 12** v1 event types (not just 8). Fictional plates and phone tails only (e.g. plate `滨A·D12345`, passenger 尾号 `3821` or a short trip code — never real phone numbers).

## Player loop (one shift = one run)

Shifts (at least these, with an in-game clock, not a real 8-hour wait): 早班 / 晚高峰 / 夜班. Player picks a shift on the start screen. Default new-energy 快车. Starting 服务分/口碑 is a qualitative grade such as「良好」plus a simplified bar, annotated「模拟，非官方算法」.

1. **开工：** optional one-shot「出车核验」prompt (feels like a face check, do not clone official liveness UI). Then on the road.
2. **听单/接单：** vehicle auto-cruises 滨江市. The **platform assigns** a 播单 card: 品类 (快车/特惠/拼车), origin, destination, simulated distance + income estimate, whether there is 加价 or 调度费, and a one-line 接单原因 (就近 / 顺路 / 口碑 etc.). Player accepts, or declines/cancels under the rules and takes the consequences. Not a frantic multi-app 抢单 wall.
3. **接驾：** auto-nav to pickup. Incidents may fire: can't find passenger, no-stop zone, traffic restriction detour, low battery. On arrival, waiting starts. Free wait must not be billed. To keep waiting after free wait ends, player must first get passenger consent, then enter「计费等待」(use a clearly simulated wait rate, never claim an official 每分钟 x 元 table).
4. **上车仪式：** confirm fictional plate + passenger phone tail or trip code; remind seatbelt; handle drunk-unaccompanied or child-unaccompanied if that trip needs it. Then player taps「开始行程」. Starting the meter before the passenger is in the car is a wrong option that risks 投诉 / 服务分.
5. **行程中：** auto-drive. Occasional decisions: toll road (must communicate surcharge first), hospital/elderly demeanor, passenger cancel, mandatory rest, AC/attitude/odor complaint, etc. Default follow navigation.
6. **到达与账单：** end billing. Show simulated bill: 乘客实付、司机收入、抽成、奖励或调度/加价、附加费. Label「模拟计价、非官方」. Payment completes automatically (no real payment UI that looks official).
7. **评价与收尾：** passenger rating changes the qualitative 服务分/口碑. Occasional voluntary 打赏 (all to the driver, simulated). Then back to 听单, or mandatory rest, or charge, until the shift clock ends (player can also end the shift).
8. **交班：** one-screen receipt: completed trips, simulated income, 服务分 change, key event results, trip log. Persist in `localStorage` so refresh can continue; no accounts.

Failure / pressure comes from: at-fault cancels, complaints, mandatory rest breaking the rhythm, battery exhaustion, bad choices made to save time. There is no steer-to-fail.

Guarantee in every complete shift playthrough seed (or via a deterministic test/debug seed): both **特惠** and a pre-pooled **拼车** can appear, plus a mix of the 12 events. A normal unseeded shift should still be able to encounter them.

## HUD and visual (original; do not skin an official app)

Reference HK sim information density (windshield world + left order/status + right gauges), rewritten in mainland 快车 language:

- **View:** simplified 滨江市 street auto-scrolling toward the player. Low-poly / flat-shaded first-person cabin looking through a windshield. Buildings and signs should feel like a fictional mainland city (商圈、医院、高铁、机场方向、充电站、夜间排档), **not** 茶餐廳 / 涼茶 / red HK taxi hood / 冚旗 plate.
- **Shift status pill:** 听单中 / 接驾中 / 等待中 / 行程中 / 强制休息 / 充电.
- **播单 or current order card** (left): 品类, OD, simulated estimate, surge if any. During a trip, show remaining km / dest.
- **Center panel:** RMB trip / estimate panel — **not** a giant red LED 咪表 and **not** `HK$`. Currency is 人民币「元」.
- **Right:** analogue or clean digital speed (traffic readout, not a player control), 电量, 服务分/口碑 bar, in-world clock, light traffic/weather chip.
- **Top chrome:** running 本班收入 (can start at 0; no cab-rent debt), 1x/2x, sound, pause.
- **录音状态:** small「行程录音中」mark when a trip is active. Not a playable recording.
- **Decision modal:** centered dark card, 2–4 stacked choices, result chips (服务分, 收入, 时间). Open modals freeze the clock.
- **Disclaimer** on title and in the footer, and once at shift start: unofficial fan work; rules and prices are simulated.
- **End of shift:** tall light receipt over a dimmed cockpit (perforated edge welcome), red loss / green profit, trip log expandable. No 车租, no 石油气, no 尿急/爆煲 stats. Instead: 完单数, 模拟收入, 抽成说明, 服务分变化, 有责取消, 投诉, 充电/强制休息次数, 行程列表.

Visual tone: warm orange / amber + dark cockpit + map. Original icons, type, and cards. It may vaguely recall a mainland ride-hail “出车” mood, but must not be a clone of any official driver app, logo, mascot, or login/payment page. Do not use official screenshot assets.

Start screen: title 《网约车司机模拟器》, short tagline, fictional driver card (name, Lv, fictional plate), shift picker (早班/晚高峰/夜班), default 新能源快车, 出车开工 CTA, footer disclaimer. World already “running” behind the menu is a good feel to copy.

Mobile: playable in a phone browser. Dense HUD may stack or scale, but a full shift must be completable. Prefer 44px targets for primary choices.

## 12 event types (all required)

Each must be implemented and fireable. Consequences are qualitative: 完成订单 / 无责取消 / 有责取消 / 投诉风险 / 服务分升降 / 损失等待时间. Do not invent official fine tables. Each type should be comment-cited or documented back to `docs/RESEARCH.md` §4.

1. 无人陪同的醉酒乘客（拒载 / 报备 / 联系叫车人）
2. 儿童或未成年人乘车（是否有成人陪同）
3. 上车点错误或长时间找不到人（等够、两次联系、报备取消 vs 提前计费）
4. 免费等待结束，是否征得同意后计费等待
5. 等完了乘客又取消
6. 限行、限号或封路导致无法按原路上门
7. 是否走高速/收费路，并提前沟通附加费
8. 电量不足，去不去充电
9. 累计时长触发强制休息（simulate the public 4h / 20min and 10h / 6h structure; label as 模拟规则）
10. 医院或助老就医单（安静、协助，不编优先奖金）
11. 空调、态度或异味引发的投诉与申诉（异味首次反馈不应直接扣模拟现金）
12. 平台消息（出车核验、安全学习、播单原因、健康提醒）

Nice-to-have if time: mid-trip destination change, pre-pooled 拼车 flavor, pet with consent, station luggage, extreme weather. Do not let these delay the required 12.

## City and content

Invent a small but flavorful 滨江市: 滨江机场、滨江高铁站、市一医院、江湾商圈、夜生活散场点、若干充电站、限行提示路段. Do not claim real municipal official rates or a real city's 2026 restriction timetable. Plates like `滨A·xxxx`.

Simulated fare structure may include 起步/基础费, 里程, 时长或低速, 远途, 分时, 临时加价或调度费（加价归司机）, 一口价 for 特惠, 附加费 (高速/路桥). Numbers are fictional 滨江市模拟计价 only, always labeled. 特惠 is a cheaper fixed-price variant of 快车, not “90% official”. 拼车 is one already-pooled trip with two drop-off flavor if you want, but no mid-trip second pickup matching.

## Tech

- Vite + TypeScript, bun, static site, no backend.
- `package.json` scripts:
  - `"dev": "vite"`
  - `"build": "tsc --noEmit && vite build"`
  - `"preview": "vite preview"`
  - `"test": "bun test"`
  - `"check": "tsc --noEmit && bun test"`
- TypeScript strict enough to keep `tsc --noEmit` green.
- Persist shift progress in `localStorage` (version the key, e.g. `eds-v1`).
- No secrets, no `.env` with tokens, no official SDKs.
- Keep the bundle reasonable; no paid map token required. A CSS/canvas/SVG stylized street is preferred over a heavy 3D engine. Simple original graphics, no copied assets from hktaxisim.com.
- Phone-playable; prioritize a smooth shift over fancy car meshes.

## Tests (`bun test` / `bun run check` must be green)

Add real tests, not placeholders. At least:

- **Trademark guard:** player-facing string tables, `index.html` title, package name, and start-screen copy contain none of `滴滴`, `DiDi`, `didi`, `滴滴出行`.
- **State machine:** 听单 → 接驾 → 等待 → 核验 → 行程 → 账单 → 评价 → 听单 or 交班, including decline and at-fault / no-fault cancel paths.
- **Dispatch card schema:** every offer has 品类, origin, destination, simulated estimate.
- **Shift mix:** a deterministic seed can produce both 特惠 and pre-pooled 拼车 in one shift.
- **All 12 event types** are registered and can be triggered (unit-level is enough; you may use a test helper / debug seed, but production play should also be able to see them over a shift).
- **Billing:** every bill is flagged 模拟计价、非官方; commission is not a constant 14%.
- **No official rate claims** in copy (reject phrases like「官方现行价」or「固定抽成 14%」).
- **localStorage** save / restore of an in-progress shift.
- **Fictional identifiers:** plates and phone tails match the allowed fake patterns.

## README

Rewrite README (on this branch only) in 简体中文: how to run (`bun install`, `bun run dev`, `bun run check`, `bun run build`), what the game is and is not, unofficial disclaimer, link to `docs/LOCKS.md` and `docs/SPEC-DRAFT.md`. Do not put 滴滴 in the README title or heading.

## Git

- You are already on `agent/puppy/v1`. Commit with clear messages.
- You may `git push -u origin agent/puppy/v1`.
- **Do not merge to main. Do not push to main. Do not deploy. Do not run wrangler. Do not open the PR** (the coordinator will).
- Do not commit secrets, `.env`, `node_modules`, `dist/`, or the HK reference PNGs. `screenshots/` is gitignored; you may write local screenshots there if useful.
- If you comment on GitHub, comments must start with `Puppy:`.

## Done when

All of SPEC-DRAFT.md §7 success criteria, plus all 12 events (not just 8), plus green `bun run check` and `bun run build`.

End with a summary: what you built, tip SHA, check/build results, any gaps, and weekly usage % remaining. Do not claim UAT or acceptance passed.
