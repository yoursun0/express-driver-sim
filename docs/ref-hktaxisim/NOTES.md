# Hong Kong Taxi Simulator — reference notes

**Live URL played:** https://hktaxisim.com/ (HTTP 200; title “Hong Kong Taxi Simulator” / 「香港的士司機模擬器」)  
**Fallback URL:** https://hk-taxi-sim.pages.dev/ — not needed; primary site was up. The game itself treats this as the old origin and can migrate saves to hktaxisim.com.  
**Session:** 22 Nov 2026. No login, no purchase, no tips. Played one full **早更** (day shift 05:00–17:00) in **繁中**, red urban taxi, Hybrid cab「小露寶」, start/return at 觀塘, ride-app mode「咩單都接」.  
**Outcome:** Shift auto-ended at 17:00 in 中環. Receipt: **-$1,053**. 1 completed fare (觀塘 → 皇后大道中, 12.1 km, +$175), plus a found-phone tip and a bladder-failure penalty.

---

## 1. Visual style and layout

- **Tone:** Stylized low-poly / flat-shaded **first-person cab interior** looking out a windshield onto a looping Hong Kong street. Buildings are chunky pastel blocks with neon or painted shop signs (茶餐廳, 涼茶, 藥房, 海味, 粥麵, 五金, 文具, 燒味, 桑拿, 押, 金龍酒家, 「推你落街」, 「出入平安」). A red visor/hood fills the lower windshield; vertical neon on the start screen reads **「香港的士 / 司機模擬」**. Other cars and a mountain backdrop appear in the distance. Rear-view mirror shows passenger silhouettes once a fare is on board.
- **Typography:** Noto Sans HK + Noto Serif HK for UI; **Share Tech Mono** for the taximeter digits. Dark navy cockpit (`theme-color #14182a`), yellow primary CTAs, red warning states.
- **Start screen (01, 02, 04):** Left-hand scrollable setup column over the live cab view (the world is already “running” behind the menu). Top: title, tagline, fake **的士司機證** (default 陳大文 / CHAN TAI MAN, Lv 1 新丁/Rookie, XP, plate e.g. VT 5586). Then Edit card, Achievements 0/58, Leaderboard, The Boss Cab, a limited event banner (沙田賽馬日), and Daily challenge. Below: shift / taxi colour / car / depot / ride-app settings, rent preview, **取車開工 / Start the shift**. Footer: Sound, Updates, Add to home screen, tip CTA. Language flags sit on the windshield’s top-right.
- **In-shift HUD (05, 14):**
  - **Top of windshield:** shift net cash (e.g. 今更淨額 -$520), 1x/2x, sound, pause, compact language control. A hanging **冚旗 / OUT OF SERVICE** plate on the left of the glass (click to go off-hire). Status pill in the middle of the hood: e.g. 「觀塘 掃街中」, 「去 裕民坊的士站 1.0 km」, 「皇后大道中 11.6 km」, or end-of-shift 「15 分鐘內返 觀塘 (12 km)」.
  - **Dashboard, three columns:** (1) three **Call車平台 A/B/C** job phones; (2) **的士咪錶** with huge red LED fare, 今程公里 / 附加費 / 位置, and a radio ticker below; (3) analogue speedo (0–120 km/h) plus **氣量 / 疲勞 / 尿急** bars, clock, and a weather chip (路順 / 車多 / 大塞車 / 黃雨).
  - **Action row under the meter:** 🚖 掃街, 🅿️ 的士站 (becomes 離開車龍 when queued), 🚻 冚旗 (turns **red** when bladder is critical), 🏁 交更 (turns **red** when the return timer starts). **揸法:** 慳氣 / 正常 / 飆車.
- **Dialogs:** Centered dark modal cards with an emoji header, body copy, and stacked choice buttons. Rewards/penalties render as chips (`+$50`, `😪 -8%`, `投訴 +1`). The end-of-shift screen is a **tall white receipt** (“老司機營運日誌”) over a dimmed cockpit, perforated bottom edge, red loss / green profit.
- **Fonts and chrome feel reusable;** the red hood, LED meter, hanging 冚旗 plate, and Canto shop signs are the HK skin.

---

## 2. Driving model: automatic, not player-steered

Driving is **on-rails / automatic**. There is no WASD, mouse-steer, or lane control. The street scrolls past the windshield by itself. The player only chooses:

- **Where to work:** 掃街 (cruise for street hails), 的士站 (queue at a named rank), 冚旗 (off-hire / toilet / break), 🏁 交更 (return the cab), plus occasional special jumps (e.g. 🔥 去沙田 when race-day radio fires).
- **How hard to drive:** 慳氣 (eco), 正常, 飆車 (speed). These appear to trade fuel/risk vs time; we stayed on 正常.
- **Time compression:** a HUD toggle cycles **1x ↔ 2x**. Pause is available, but open modals also freeze the clock.
- **Speedometer is a traffic readout, not a player control.** Examples from this shift: ~26–36 km/h in ordinary traffic, ~17–19 km/h under 「大塞車」, 0 km/h in a taxi-stand queue.

To go somewhere (a stand, a drop-off, a car wash, returning the cab) you pick it from a menu; the game then drives there and counts down remaining km.

---

## 3. How passengers appear, and accept / decline

Three acquisition channels, all with an explicit accept/decline (offers **time out** if you wait):

### A. Street hail (掃街)

A pedestrian silhouette waves at the kerb. A windshield card asks you to pick a passenger by **visible traits**, not by destination (destination is hidden until after accept — see 開盒).

Copy actually seen:

- 「揀接邊一個客人？」 with two cards, or 「有人招手，接唔接呢個客人？」 with one card. Decline: **「唔停，繼續掃街」**.
- Traits are 2-line flavour tags, for example:
  - 👜 拎住個名牌手袋 / 🏇 揸住份馬經
  - 👵 白頭髮老人家 / 📱 望住手機
  - 🏥 手腕仲戴住醫院手帶 / 😴 一臉倦容
  - 🏃 跑緊過嚟 / 🥬 挽住幾袋餸
  - 🛍️ 拎住幾袋嘢 / 💻 攬住部手提電腦
  - 🎧 戴住耳機 / 🧥 著住件厚褸
  - 📱 望住手機 / 🤰 挺住個大肚
  - 🛍️/💻, 捉住手機, 不停望錶, etc.

The hospital-wristband passenger we accepted was later logged as trade-slang type **「手仔」**. Changelog and the summary’s 「接過幾多類客人 2 / 54」 imply a large passenger-type collection.

### B. Taxi stand (的士站)

Opens 「去邊個的士站排隊？」. Nearby small ranks vs starred larger / **過海站**. Each row shows distance, typical fare mix, and queue length. Flavour: 「附近小站排得快，大站大旗機會較高，但要等耐啲。」 **過海站** note: 「乘客只付單程隧道費」. Cancel: 「唔去喇」.

Ranks offered from 觀塘 included 裕民坊、apm、創紀之城、啟德站、荷里活廣場, plus cross-harbour stands (創紀之城過海、九龍城過海、紅磡站過海、北角道過海、廣東道過海、西九龍站過海) and 啟德體育園.

On arrival the HUD shows 「的士站 TAXI / 裕民坊的士站 / 前面 0 架車」 and the 的士站 button becomes **離開車龍**. When it is your turn:

> 輪到你！接唔接呢個客人？  
> 呢位客  
> 🏃 跑緊過嚟 / 🥬 挽住幾袋餸  
> 唔接，重新排隊

### C. Ride apps (Call車平台 A/B/C)

Three generic (unbranded) phones sit in standby: 「等單中… / 📱 咩單都接 / 撳一下改設定」. Incoming jobs light up the panel with a **搶！** button. Examples actually seen:

- 「中途：又一城 ≈$91 搶！」
- 「客加 $20 小費 / 中途：1881 ≈$130 搶！」
- 「客加 $20 小費 / 雞腳：裕民坊 ≈$57 搶！」
- Short job to 牛頭角 ≈$33

Jobs expire quickly. While you already have a passenger the phones switch to **「有客中」**. Start-menu modes: 「咩單都接」 vs 「專做長途」 (「淨係出長途單，但單少好多，多數係 85 折或者鹹豆單」). English: “Take any job” / “Long trips only… mostly discounted.”

### After accept: 開盒 (destination reveal)

The destination is a **loot-box style reveal** — the iconic HK “open the box” moment. Then you may still refuse, at legal risk.

Copy from the completed fare (12):

> 開盒！佢要去  
> **中途過海**  
> **皇后大道中**  
> 中環，12.1 km ≈$176  
> 闊落客出手闊綽，好多時唔使找  
> **開車**　　**拒載（有機會罰 $500）**

An earlier (missed) stand passenger revealed: 「雞腳 / 順利邨 / 3.4 km ≈$46 / 趕時間客揸快啲佢先開心」 with the same 開車 / 拒載 pair.

Passenger *types* we saw on the box: 闊落客 (generous, often “keep the change”), 趕時間客 (in a hurry; wants 飆車).

---

## 4. Fare, meter, currency, time

- **Currency:** HKD, written **HK$** on the meter and **$** in UI (車租 $520, ≈$176).
- **Meter states:** **空車** shows placeholder LED `888.0`. **載客** (green badge) shows a live fare. Labels: 今程公里, 附加費, 位置 (district updates on arrival; ours flipped 觀塘 → 中環 after the trip).
- **Flag-fall / progression observed:** trip started at **HK$29.0** (current urban flag-fall), **$92.0 at 8.0 km**, **$94.0 at 8.4 km**. That matches real HK urban taxi arithmetic: $29 first 2 km, then about **$2.1 / 0.2 km** (~$10.5/km).
- **附加費** jumped to **50** as soon as this cross-harbour trip began (before distance accrued) and stayed at 50 mid-trip. Likely prepaid extras (tunnel and/or booking). Final trip payout in the log was **+$175** on a ≈$176 estimate.
- **Shift money** is a running **今更淨額**, starting negative at rent (day shift hybrid: **-$520**). Phone tip moved it to -$470; bladder wash to -$770; completed fare to -$595; end-of-shift fees then landed at **-$1,053**.
- **Clock** is in-world shift time (05:00 start → 17:00 end for 早更). 1x/2x compresses it. Radio lines are timestamped (「司機台 05:38…」, and expire as 「已過時」).
- **Must return** the cab to the chosen depot, **tank ≥ 90%**. A countdown appears near shift end: 「🏁 16 分鐘內返 觀塘（12 km）」. Missing it auto-closes the shift with an **逾時交更罰款**.
- **Accounting on the receipt (this shift):**  
  車費及貼士收入 $250 (the $175 fare + $50 phone tip + $25 tunnel collected from the passenger)  
  車租 -$520  
  隧道費 -$25  
  平台抽水 -$0 (no app jobs completed)  
  石油氣 -$122  
  罰款及賠償 -$636, of which the receipt explains: 交更時 45% 氣 → 補氣同行政費 $172; 逾時交更罰款 $286. The earlier 洗車 / 投訴 costs also sit in this bucket.

---

## 5. Resource / need meters

Always visible on the right-hand HUD:

| Meter | EN / 繁中 | Start (this shift) | Notes |
|---|---|---|---|
| Fuel | Gas / **氣量** | 100% | LPG for 小露寶. Drains while moving. Must return ≥ 90% or pay refill + admin. |
| Fatigue | Tired / **疲勞** | 10% | Climbs over the shift (we hit ~75% by 17:00). Food event: 「等紅燈食兩粒燒賣，精神返晒。」 **😪 -8%**. Full-day shift copy warns you must find time to sleep. |
| Bladder | Bladder / **尿急** | 15% | The comedy core of the game. ~61%: toast 「開始有尿意，留意下邊度有廁所。」 ~80–84%: 冚旗 button turns red; a toilet shortcut appears. ~99–100%: **爆煲** — forced car-wash incident, fare voided, rating down, complaint +1, large fee, bladder resets to ~0–8%. |
| Cash | 今更淨額 | -$520 rent | See §4. |
| Rating / complaints | 評分 / 投訴 | hidden on HUD | Not a constant bar; surfaces on events and the receipt (我們: 投訴 1, 「評分下跌」). |
| XP / level | 經驗 / 司機證 | Lv 1 新丁, 0/300 | This shift +235 XP, 65 to next level. Titles unlock with level; cars lock at Lv 15, 30, 45… |
| Achievements | 成就 | 0/58 → 1 | Four categories (Updates): Garage, Passengers, Milestones, Oddities. We unlocked **💸 倒貼車租**. Can be worn as a badge on the ID / leaderboard. |

Toilet flow exists (🚻 冚旗 / 去廁所 on the receipt as a counted stat) but we failed to use it in time (去廁所次數 0, 爆煲次數 1).

---

## 6. Event types actually seen (quoted)

Only events that appeared in this playthrough. Changelog hints at many more (typhoons, bargainers, longer-route-for-more-fare, taxi-switching passengers, EV charging / battery swap, fleet bays).

1. **Radio / traffic (ticker, not a modal)**  
   - 「司機台 05:38何文田有車撞車，附近大塞車」  
   - 「司機台 07:22北角有車撞車，附近大塞車」  
   - 「老細 馮曦妤 08:17屯門公路有車撞車，荃灣方向塞到動彈不得」  
   - 「司機台 09:59葵涌港鐵故障，葵涌廣場一帶好多人截的士」  
   - 「老細 吳順超 12:11觀塘交通督導員出動抄牌，小心泊車」  
   - 「司機台 16:30沙田馬場散場，馬迷等緊車」 + a special action **🔥 去沙田**  
   Weather chips moved 路順 → 車多 → 大塞車, plus a **黃雨信號** and toast 「天文台取消暴雨警告。」  
   “老細” is a radio character (The Boss Cab / 老細車廂 on the home screen).

2. **Found phone (08, 09)**  
   > 後座有部手機  
   > 部手機響個不停，來電顯示「老婆」。  
   > 聽電話約佢交還 — 8 分鐘，可能有謝禮  
   > 交去警署 — 12 分鐘，最穩陣  

   We chose the first. Result: 「失主趕到，硬塞 $50 多謝你。」 **+$50 / +8 分鐘**.

3. **Bladder failure + car wash (10)**  
   > 先去洗車，再搵食  
   > 今次放你一馬，但再爆多次就真係收工。  
   > -$300　評分下跌　今程冇錢收，投訴 +1　+40 分鐘  
   > 去洗車  

   (This fired after we had accepted a stand passenger but before that fare could complete.)

4. **Harbour-tunnel route choice (13)**  
   > 揀路線  
   > 客人冇講點行，你話事。兜得太遠，客人會覺得你劏客。  
   > 紅隧 — 約 13.6 公里・約 27 分鐘・隧道費 $25（客人俾）  
   > 東隧　最近 — 約 12.1 公里・約 22 分鐘・隧道費 $25（客人俾）  
   > 西隧　最快 — 約 12.8 公里・約 21 分鐘・隧道費 $25（客人俾）  
   > 🧭 今更唔使再問，自動揀 — 有客指定就跟客，冇就揀最快  

   We picked 東隧 (nearest, matched the quoted 12.1 km). In-trip banter: 「闊落客：『去皇后大道中，路你揀，我信你。』」

5. **Passenger treats you to food (15, 16)**  
   > 客人請你食嘢  
   > 「師傅，食咗飯未？呢盒點心我買多咗，你拎去食啦。」  
   > 「多謝晒！」— 解倦  
   > 「唔使客氣，我食咗」— 客客氣氣  

   Accepted. Result: 「等紅燈食兩粒燒賣，精神返晒。」 **😪 -8%**.

6. **End-of-shift receipt (18–20)** — see §4 and §8. Title stamp we earned: **「膀胱決堤災民」** (紅的專屬稱號). Review line: 「評語：唔合格嘅的士佬」. Trip log line: 「1. 13:41　手仔　中途　過海　東隧　+$175　觀塘 → 皇后大道中（中環）　12.1 km」.

---

## 7. Language options

Always-visible flag group **Language** (not a buried settings page):

- 🇭🇰 **繁中** — Hong Kong Traditional Chinese, heavy Cantonese (default flavour of the game). Page title becomes 「香港的士司機模擬器」.
- 🇹🇼 **台灣** — Taiwan Traditional (button present; not fully walked in this session).
- 🇬🇧 **EN** — full English UI on the start screen and HUD (Gas / Tired / Bladder, Taximeter, Ride app A/B/C, Start the shift, etc.).

There is no separate “Settings” panel beyond: language flags, **🔊 Sound: on**, ride-app mode, 1x/2x, pause, and the start-of-shift loadout. 「✏️ 改名／換相 / Edit card」 customises the driver ID.

**Tagline, 繁中:** 「揸足一更，賺到錢、唔好食牛肉乾，最緊要唔好瀨尿。」  
**Tagline, EN:** “Work one full shift, make a profit, avoid tickets, and above all, get to a toilet in time.”

---

## 8. Start-of-shift loadout (for cloning the feel)

**Shifts**

| | Hours | EN / 繁中 flavour |
|---|---|---|
| Day / 早更 | 05:00–17:00 | “Heavy traffic and short fares. Traffic wardens are everywhere, so illegal parking usually costs you.” / 「塞車多、雞腳單多。交通督導員最活躍，亂泊好易食牛肉乾。」 Rent for hybrid this session: **$520**. |
| Night / 夜更 | 17:00–05:00 | “Clear roads and strange passengers. More long fares from the airport and Lan Kwai Fong. Late at night, a quick illegal stop may work.” First load (night selected) showed rent **$460**. |
| Full-day / 特更 | 05:00–05:00 | “Drive a full 24 hours. Cheaper than renting day and night separately, but you must find time to sleep.” |

**Taxi colour = difficulty + operating area (real HK colour system)**

- 🔴 Red / 紅的 — Normal / 普通. 「全港行走（大嶼山南部除外）。單多周轉快，但塞車、過海爭議多，車租高。」
- 🟢 Green / 綠的 — Hard / 困難. NT-only with limited set-down points in Tsuen Wan / Tsing Yi / Sha Tin; then empty return or a designated rank.
- 🔵 Blue / 藍的 — Hell / 地獄. Lantau only, ~50 cabs, tourist demand, high rent.

**Cars (garage):** Hybrid cab 小露寶 (LPG, 4 seats, starting car) plus level-locked: Old four-seater, Luxury six-seater, Battery-swap sedan, Budget EV, Fleet EV, Old five-seater; several “Coming soon / 敬請期待” (wheelchair, seven-seater, luggage king…). Each has a radar of Seats / Low rent / Pick-up / Range / Refuel. EVs and fleet cars are changelog features (charging, battery swap, dedicated bays).

**Depots seen:** 觀塘, 荃灣, 屯門, 東涌, 旺角, 紅磡, 長沙灣, 將軍澳, 銅鑼灣, 堅尼地城, 柴灣, 香港仔, 北角, 尖沙咀, 鑽石山, 九龍塘, 沙田, 葵涌, 灣仔, 深水埗, 啟德, 青衣.

Rent disclaimer (繁中): 「車租 $520，滿氣取車，交更前要入返九成氣或以上。一開工就係：-$520」  
Start toast: 「觀塘 取車，開工！車租已經扣咗，滿氣出發。」

---

## 9. Mobile vs desktop layout

- Played at **1920×1072 desktop**. The cockpit is a wide 3-column dashboard under a large windshield; the start menu is a left column over that view.
- The site is built as a **PWA**: `manifest.json`, Apple mobile-web-app tags, title 「的士模擬器」, **「加入主畫面 / Add to home screen」**, `viewport-fit=cover` and `user-scalable=no`. Meta description: 「免費網頁遊戲，手機電腦都玩到。」
- CSS breakpoints include `max-width: 370px / 520px / 820px portrait`, `max-height: 480px landscape`, `min-width: 640px / 1000px`, and `@media (pointer: coarse)` for touch. A narrow phone would almost certainly **stack** the three dashboard columns and enlarge the action buttons; this was not separately screenshot at a phone viewport in this session.

---

## 10. Deep links / URL params

- Canonical origin: `https://hktaxisim.com/`. Old origin `https://hk-taxi-sim.pages.dev/` can **#pull** a packed save and redirect to the new origin with **`#import=...`**. After import, the hash is stripped (`history.replaceState`).
- **`#test`** — stays on a test/dev path; hostnames containing `test` (e.g. `hk-taxi-test.pages.dev`) are a separate test backend and should not write the real leaderboard.
- Query **`?fx=`** (letters, case-insensitive): `b` disables glow (`fx-noglow`), `c` disables rain (`fx-norain`).
- No login gate for play. Optional tip/support exists (Ko-fi / PayMe / AlipayHK, plus a “free taxi card” path); **not used**. Social: Threads `@hktaxisim`. Leaderboard branded **Hong Kong DC9**.
- In-play URL stayed `https://hktaxisim.com/` with no visible path change.

---

## 11. Uniquely Hong Kong vs reusable systems

**Keep / skin as “Hong Kong” (do not lift as-is into a DiDi-mainland game):**

- Red / green / blue taxi operating areas and the 紅的/綠的/藍的 difficulty mapping.
- Physical **的士咪錶**, hanging **冚旗** plate, **開盒** destination reveal, **拒載** vs $500 fine.
- Trade slang: 雞腳 (short fare), 大旗 (long “flagship” fare), 食牛肉乾 (ticket), 劏客 (padding the route), 掃街, 交更, 新丁, 小露寶, 鹹豆單, 手仔, 闊落客, 老細.
- Three harbour tunnels (紅隧/東隧/西隧), 「客人俾」 tunnel fee, 過海站 “passenger pays one-way only”.
- LPG 石油氣, 的士司機證 layout, Sha Tin race-day crowd, traffic wardens 抄牌, 黃雨, 茶餐廳 neon, 馬經, Canto radio, Noto Sans/Serif HK, “keep the change / 唔使找”.

**Reusable loop (the feel to clone):**

1. **Loadout** — shift length, vehicle class, depot, job-filter (any job vs long only), rent deducted up front, fuel-return rule.
2. **Automatic driving** with player decisions, not steering: cruise vs rank vs off-hire vs go-home, plus a drive-style tradeoff and 1x/2x time.
3. **Dual demand:** street hail (trait-based, destination hidden) + in-dash ride-app auction (destination + estimate + tip + 搶/accept with a short window).
4. **Need meters** that force mid-shift breaks: fuel, fatigue, bladder (or analogue: meals, vehicle condition). Failure is an event, not a silent game-over.
5. **Decision cards** with time/money/reputation chips: lost-and-found, passenger flavour events, route choice, weather/traffic radio that changes the road state.
6. **Live meter + extras + running shift P&L.**
7. **End-of-shift receipt:** trip count, short vs long mix, tickets, complaints, refusals, breaks, “burst” fails, mileage, income vs rent / fuel / commission / fines, XP, titles, achievements, optional shareable card / leaderboard.
8. **Meta:** driver ID, levels unlocking vehicles, daily challenge, limited-time city events, 58-achievement grind.

---

## 12. Gameplay loop (concise)

Start at a depot after paying rent with a full tank → **sweep streets and/or sit a rank and/or snatch app jobs** → accept or decline from traits / estimate (not always from destination) → **開盒** reveals destination and passenger type; drive or risk a refusal fine → optionally **pick a route** (time vs “ripping off” the passenger) → meter runs, mid-trip events fire, needs climb → drop off, money hits the shift net → manage toilet / fuel / fatigue before they blow up → when the clock runs down, **deadhead home with enough fuel** or pay late-return and refill penalties → read the receipt, take XP/achievements, start another shift.

This reference shift under-traded (too much empty 掃街 in the morning, ignored the toilet, missed the return window) and still showed the full loop: app offer, stand queue, street hail, 開盒, tunnel choice, in-trip event, bladder failure, and the end-of-shift log.

---

## 13. Screenshots

All under `/workspace/didi-taxi-sim/ref-hktaxisim/`:

| File | What it shows |
|---|---|
| `01-title.png` | English title / driver ID / shift & taxi select, cab view |
| `02-title-start-options.png` | Car stats, depots, ride-app mode, Start the shift, rent -$520 |
| `03-updates.png` | Updates changelog modal (features / event types) |
| `04-language-zh-hant.png` | 繁中 start screen; language flags 繁中 / 台灣 / EN |
| `05-hud-in-shift.png` | In-shift HUD: meter 空車, apps on standby, 掃街, needs, 1x/2x |
| `06-taxi-stand-choice.png` | Stand picker + a live app offer 「中途：又一城 ≈$91 搶！」 |
| `07-passenger-accept.png` | Street-hail accept/decline (two trait cards) |
| `08-incident-phone-backseat.png` | Found-phone decision |
| `09-incident-phone-reward.png` | Found-phone result +$50 |
| `10-incident-bladder-wash.png` | 爆煲 / 先去洗車 incident |
| `11-stand-queue-app-offer.png` | Rank queue, critical bladder, app 搶！, 冚旗 red |
| `12-destination-reveal-open-box.png` | 開盒：皇后大道中, 開車 / 拒載 |
| `13-incident-tunnel-route.png` | 揀路線：紅隧 / 東隧 / 西隧 |
| `14-hud-in-trip-meter.png` | Live 載客 meter HK$29+, nav panel, passenger quote |
| `15-incident-passenger-food.png` | 客人請你食嘢 decision |
| `16-incident-food-result.png` | 燒賣, 😪 -8% |
| `17-passenger-accept-endshift-timer.png` | Another hail + 「15 分鐘內返 觀塘」 + red 交更 + 🔥 去沙田 |
| `18-end-of-shift-summary.png` | 老司機營運日誌 (top / totals) |
| `19-end-of-shift-summary-bottom.png` | XP, achievement, tip CTA, 再開一更 |
| `20-end-of-shift-trip-log.png` | Expanded trip list (手仔 / 過海 / 東隧) |
