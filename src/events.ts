import { SIM_WAIT_PER_MIN } from "./billing";
import { DISCLAIMER } from "./city";
import { formatHours } from "./format";
import type { Choice, EventId, Modal, RestTier, State } from "./types";

/**
 * 十二类事件。出处均为 docs/RESEARCH.md 第 4 节，按条目对应：
 * 1 drunk 醉酒无人陪同
 * 2 child 未成年人
 * 3 cant-find 找不到人
 * 4 paid-wait 免费等待结束后的计费等待
 * 5 pax-cancel 等到后又取消
 * 6 restriction 限行封路
 * 7 toll 收费路
 * 8 battery 电量
 * 9 rest 疲劳强制休息
 * 10 hospital 就医助老
 * 11 complaint 空调态度异味
 * 12 platform 平台消息
 */

export interface Effect {
  t:
    | "service"
    | "quality"
    | "complaint"
    | "toast"
    | "note"
    | "contacts"
    | "pax-eta"
    | "wait-consent"
    | "illegal-wait"
    | "early-meter"
    | "toll"
    | "ground"
    | "delay"
    | "start-trip"
    | "charge"
    | "rest"
    | "cancel"
    | "battery-risk"
    | "battery-caution"
    | "close";
  n?: number;
  text?: string;
  kind?: "无责取消" | "有责取消" | "乘客取消";
  tier?: RestTier;
}

const chip = (text: string, tone: Choice["chips"][number]["tone"]) => ({ text, tone });

function modal(
  eventId: Modal["eventId"],
  title: string,
  body: string,
  choices: Choice[],
  variant: string | null = null,
): Modal {
  return { eventId, variant, title, body, choices, blocksTime: true };
}

export function buildEventModal(state: State, id: EventId, variant?: string | null): Modal {
  switch (id) {
    case "drunk":
      return modal(
        "drunk",
        "无人陪同的醉酒乘客",
        "上车的人酒气很重，身边没有能照顾的成人。尾号和行程码对得上。模拟规则：这种情况可以拒载，也可以报备后联系叫车人。",
        [
          choice("drunk-report", "先报备，再打电话给叫车人，确认有人负责后出发", [
            chip("服务分", "good"),
            chip("多几分钟", "neutral"),
          ], true),
          choice("drunk-caller", "先联系叫车人，请对方线上确认路线和责任", [
            chip("服务分", "good"),
            chip("时间", "neutral"),
          ], false),
          choice("drunk-refuse", "礼貌说明无法运送，拒载并报备", [
            chip("无责取消", "neutral"),
          ], false),
          choice("drunk-ignore", "不报备，直接开", [chip("投诉风险", "bad"), chip("服务分", "bad")], false),
        ],
      );
    case "child":
      return modal(
        "child",
        "未成年人乘车",
        "后排是未成年人，成人还在车外打电话，没有落座。先确认有没有人陪同，再决定开不开。",
        [
          choice("child-adult", "请成人上车，提醒安全带，然后再开始行程", [
            chip("服务分", "good"),
            chip("多等片刻", "neutral"),
          ], true),
          choice("child-refuse", "成人无法陪同，礼貌拒载并报备", [chip("无责取消", "neutral")], false),
          choice("child-alone", "让未成年人单独坐车出发", [chip("投诉风险", "bad"), chip("服务分", "bad")], false),
        ],
      );
    case "cant-find":
      return modal(
        "cant-find",
        "上车点对不上",
        `导航停在${state.offer?.origin ?? "上车点"}对街，这里不能久停。免费等待还剩 ${Math.max(0, Math.ceil(state.freeWaitLeft))} 分钟。乘客电话没人接。`,
        [
          choice("find-wait", "在免费时长里继续等，并连续联系两次", [
            chip("按规则等", "good"),
            chip("暂不计费", "neutral"),
          ], true),
          choice("find-relocate", "挪到就近可停靠的位置，再用行程码核对", [
            chip("沟通", "good"),
            chip("多一两分钟", "neutral"),
          ], false),
          choice("find-cancel", "两次都联系不上，报备后取消", [chip("无责取消", "neutral")], false),
          choice("find-meter", "人还没上车就提前计费", [chip("投诉风险", "bad"), chip("服务分", "bad")], false),
        ],
      );
    case "paid-wait": {
      const enough = state.contacts >= 2;
      return modal(
        "paid-wait",
        "免费等待结束了",
        `免费等待已经用完。若要继续等，需要先征得乘客同意，再进入计费等待。本单模拟费率 ${SIM_WAIT_PER_MIN.toFixed(1)} 元/分钟，这不是价目表。`,
        [
          choice("wait-consent", "跟乘客说清楚，对方同意后再计费等待", [
            chip("征得同意", "good"),
            chip("计费等待", "neutral"),
          ], true),
          choice(
            "wait-report",
            enough ? "不再等了，按已联系两次的情况报备取消" : "不再等，直接报备取消",
            [chip(enough ? "无责取消" : "有责取消", enough ? "neutral" : "bad")],
            false,
          ),
          choice("wait-bail", "不等，也不报备，自己离开", [chip("有责取消", "bad")], false),
          choice("wait-sneak", "没问过乘客就开始算等待费", [chip("投诉风险", "bad"), chip("服务分", "bad")], false),
        ],
      );
    }
    case "pax-cancel":
      return modal(
        "pax-cancel",
        "乘客不用车了",
        "你已经按点等到，对方在上车前取消了行程。建议在司机端取消并报备。空驶只做模拟记录，不套用任何补偿表。",
        [
          choice("pax-report", "按乘客取消报备，结束这一单", [chip("无责取消", "neutral")], true),
          choice("pax-chase", "追着让乘客上车", [chip("投诉风险", "bad")], false),
          choice("pax-fake", "人没上车，仍把订单点成已完成", [chip("投诉风险", "bad"), chip("服务分", "bad")], false),
        ],
      );
    case "restriction":
      return modal(
        "restriction",
        "原路到不了上车点",
        "滨江大道这一段临时封路，尾号也碰上了本局的模拟限行。这不是任何一座真实城市的时刻表。不能私自改上车点。",
        [
          choice("restrict-talk", "跟乘客说清原因，改到能停靠的一侧", [
            chip("无责沟通", "good"),
            chip("多几分钟", "neutral"),
          ], true),
          choice("restrict-cancel", "如实报备，这一单无责取消", [chip("无责取消", "neutral")], false),
          choice("restrict-silent", "自己改地方，不告诉乘客", [chip("投诉风险", "bad")], false),
        ],
      );
    case "toll":
      return modal(
        "toll",
        "要不要走收费路",
        "导航给出一条收费更快的桥。附加费应由乘客承担，但得事先说清楚。一口价也不自动包含这笔费用。",
        [
          choice("toll-ask", "先说明附加费，乘客同意再走收费路", [
            chip("附加费", "neutral"),
            chip("服务分", "good"),
          ], true),
          choice("toll-ground", "走地面，不产生附加费", [chip("更慢", "neutral"), chip("无附加费", "good")], false),
          choice("toll-sneak", "先上桥，到了再告诉乘客", [chip("投诉风险", "bad")], false),
        ],
      );
    case "battery":
      return modal(
        "battery",
        "电量偏低",
        `剩余电量 ${Math.round(state.battery)}%。再跑远单可能会在半路停住。附近有江心充电站，可以先去补电。`,
        [
          choice("bat-charge", "就近充电，充到能跑再听单", [chip("时间", "neutral"), chip("电量", "good")], true),
          choice("bat-short", "先只接短单，电量再低就收车", [chip("谨慎", "neutral")], false),
          choice("bat-push", "不管电量，远单也接", [chip("可能抛锚", "bad")], false),
        ],
      );
    case "rest": {
      const tier: RestTier = variant === "10h" || state.restQueued === "10h" ? "10h" : "4h";
      const long = tier === "10h";
      return modal(
        "rest",
        long ? "累计计费已到休息线" : "连续服务已到休息线",
        long
          ? `模拟规则：累计计费时长满 10 小时，需要休息 6 小时。你这一档已经到了（当前计费 ${formatHours(state.billableMin)}）。听单不算计费。这不是执法文书。`
          : `模拟规则：连续服务满 4 小时，需要休息 20 分钟。当前连续服务 ${formatHours(state.serviceMin)}。听单和收车算休息，休息满 20 分钟才会清零。另一档是累计计费满 10 小时休息 6 小时。`,
        [
          choice(long ? "rest10-ok" : "rest4-ok", long ? "按规定休息" : "去休息 20 分钟", [
            chip(long ? "休息 6 小时" : "休息 20 分钟", "neutral"),
          ], true),
          choice(long ? "rest10-want" : "rest4-want", "我想再跑一单", [
            chip("平台锁单", "bad"),
            chip("仍须休息", "neutral"),
          ], false),
        ],
        tier,
      );
    }
    case "hospital":
      return modal(
        "hospital",
        "去市一医院",
        "乘客是去市一医院看病的老人，走路慢。这一单没有额外奖金，把车开稳、说话放轻就好。",
        [
          choice("hosp-help", "安静开车，到达后扶一下、不催", [chip("服务分", "good"), chip("无奖金", "neutral")], true),
          choice("hosp-normal", "平稳送到，不多管闲事", [chip("完成订单", "neutral")], false),
          choice("hosp-rush", "催乘客快点上下车", [chip("投诉风险", "bad")], false),
        ],
      );
    case "complaint": {
      const kind = variant === "ac" || variant === "attitude" || variant === "odor" ? variant : "odor";
      if (kind === "ac") {
        return modal(
          "complaint",
          "乘客觉得车里太闷",
          "后排说空调不舒服。可以商量，不必吵。",
          [
            choice("ac-yes", "按乘客的意思调节风量和温度", [chip("服务分", "good")], true),
            choice("ac-mid", "说明现在的温度，折中一档", [chip("沟通", "neutral")], false),
            choice("ac-no", "拒绝调节", [chip("投诉风险", "bad")], false),
          ],
          "ac",
        );
      }
      if (kind === "attitude") {
        return modal(
          "complaint",
          "话赶话，气氛紧了",
          "乘客觉得你态度硬。把事情说清楚，或者请平台协助。不要当街吵。",
          [
            choice("att-calm", "放慢语气，把路线和等待说清楚", [chip("服务分", "good")], true),
            choice("att-platform", "双方说不到一起，联系平台协助", [chip("留痕", "neutral")], false),
            choice("att-snap", "顶回去", [chip("投诉风险", "bad"), chip("服务分", "bad")], false),
          ],
          "attitude",
        );
      }
      return modal(
        "complaint",
        "乘客说车里有异味",
        "乘客第一次提到异味。模拟规则：首次这类反馈不直接扣收入。可以通风、道歉，也可以请平台留存说明。不要塞现金私了。",
        [
          choice("odor-air", "开窗通风，道歉，请对方再看看", [chip("服务分", "good"), chip("不扣收入", "good")], true),
          choice("odor-appeal", "解释已经清理过，并请平台留存这次说明", [
            chip("申诉", "neutral"),
            chip("不扣收入", "good"),
          ], false),
          choice("odor-argue", "当场争辩说对方太挑剔", [chip("投诉风险", "bad")], false),
          choice("odor-cash", "塞一点现金，希望对方别写评价", [chip("投诉风险", "bad"), chip("收入不因此扣", "neutral")], false),
        ],
        "odor",
      );
    }
    case "platform":
      return platformModal(variant ?? "safety");
    default:
      return platformModal("safety");
  }
}

function platformModal(variant: string): Modal {
  if (variant === "verify") {
    return modal(
      "platform",
      "出车核验",
      `本班第一次出车，平台要确认是车主本人。这是一个模拟提示，不是活体识别，也没有官方界面。${DISCLAIMER}`,
      [
        choice("verify-ok", "确认是我，完成核验并出车", [chip("可以听单", "good")], true),
        choice("verify-skip", "跳过画面，仍然出车", [chip("记一笔提醒", "neutral")], false),
      ],
      "verify",
    );
  }
  if (variant === "dispatch-reason") {
    return modal(
      "platform",
      "为什么是这张播单",
      "平台说明：派单先看距离，再看口碑和服务记录，也会看你愿不愿意去场站。下一张卡片上会写本单的接单原因。你可以看到起终点和模拟预估，再决定接不接。",
      [
        choice("reason-ok", "知道了，看卡片再决定", [chip("播单原因可见", "good")], true),
        choice("reason-later", "先记下，下一张单我自己看原因", [chip("仍会展示", "neutral")], false),
      ],
      "dispatch-reason",
    );
  }
  if (variant === "health") {
    return modal(
      "platform",
      "健康提醒",
      "平台推了一条健康提醒：喝口水，活动一下肩膀。这不是诊疗，也不替代休息规则。连续服务满 4 小时仍要按模拟规则收车。",
      [
        choice("health-ok", "停车间隙喝了水", [chip("状态", "good")], true),
        choice("health-later", "先记下，下一单间隙再说", [chip("稍后", "neutral")], false),
      ],
      "health",
    );
  }
  return modal(
    "platform",
    "安全学习",
    "一条短学习：开车前提醒系安全带；乘客没上车不能计费；收费路要事先说。看完即可继续听单。",
    [
      choice("safety-ok", "看完了，继续听单", [chip("学习", "good")], true),
      choice("safety-later", "先划掉，回头再看", [chip("仍可听单", "neutral")], false),
    ],
    "safety",
  );
}

function choice(id: string, label: string, chips: Choice["chips"], safe: boolean): Choice {
  return { id, label, chips, safe };
}

export function effectsFor(state: State, choiceId: string): Effect[] {
  switch (choiceId) {
    case "verify-ok":
      return [{ t: "toast", text: "核验完成。滨江市，出车。" }, { t: "close" }];
    case "verify-skip":
      return [
        { t: "service", n: -1 },
        { t: "toast", text: "你跳过了画面。平台记了一笔提醒，人已经在路上。" },
        { t: "close" },
      ];
    case "reason-ok":
    case "reason-later":
    case "safety-ok":
    case "health-ok":
      return [{ t: "close" }];
    case "safety-later":
    case "health-later":
      return [{ t: "note", text: "学习或提醒稍后再看。" }, { t: "close" }];
    case "drunk-report":
      return [
        { t: "service", n: 1 },
        { t: "quality", n: 1 },
        { t: "delay", n: 3 },
        { t: "toast", text: "已报备，叫车人确认有人负责。可以出发。" },
        { t: "start-trip" },
      ];
    case "drunk-caller":
      return [
        { t: "service", n: 1 },
        { t: "quality", n: 1 },
        { t: "delay", n: 4 },
        { t: "toast", text: "叫车人在线上确认了路线。出发。" },
        { t: "start-trip" },
      ];
    case "drunk-refuse":
      return [
        { t: "toast", text: "已礼貌拒载并报备。" },
        { t: "cancel", kind: "无责取消", text: "醉酒且无人陪同，已报备拒载" },
      ];
    case "drunk-ignore":
      return [
        { t: "service", n: -4 },
        { t: "quality", n: -3 },
        { t: "complaint" },
        { t: "toast", text: "没有报备就走了，投诉风险留下了。" },
        { t: "start-trip" },
      ];
    case "child-adult":
      return [
        { t: "service", n: 1 },
        { t: "quality", n: 1 },
        { t: "delay", n: 2 },
        { t: "toast", text: "成人上车了。安全带提醒过，开始行程。" },
        { t: "start-trip" },
      ];
    case "child-refuse":
      return [{ t: "cancel", kind: "无责取消", text: "未成年人无成人陪同，已报备" }];
    case "child-alone":
      return [
        { t: "service", n: -4 },
        { t: "quality", n: -3 },
        { t: "complaint" },
        { t: "toast", text: "未成年人单独乘车出发，这是危险选择。" },
        { t: "start-trip" },
      ];
    case "find-wait":
      return [
        { t: "contacts", n: 2 },
        { t: "pax-eta", n: 4 },
        { t: "service", n: 1 },
        { t: "toast", text: "你留在免费等待里，并联系了两次。计费还没开始。" },
        { t: "close" },
      ];
    case "find-relocate":
      return [
        { t: "contacts", n: 1 },
        { t: "pax-eta", n: 3.5 },
        { t: "delay", n: 2 },
        { t: "toast", text: "你挪到了可停靠的一侧，并用行程码再确认了一次。" },
        { t: "close" },
      ];
    case "find-cancel":
      return [{ t: "contacts", n: 2 }, { t: "cancel", kind: "无责取消", text: "找不到人，两次联系后报备取消" }];
    case "find-meter":
      return [
        { t: "service", n: -4 },
        { t: "quality", n: -3 },
        { t: "complaint" },
        { t: "early-meter" },
        { t: "toast", text: "人还没上车。提前计费会被投诉，这一单的等待费不会算进收入。" },
        { t: "close" },
      ];
    case "wait-consent":
      return [
        { t: "wait-consent" },
        { t: "service", n: 1 },
        { t: "toast", text: `乘客同意了。之后的等待按模拟 ${SIM_WAIT_PER_MIN.toFixed(1)} 元/分钟计入。` },
        { t: "close" },
      ];
    case "wait-report":
      return state.contacts >= 2
        ? [{ t: "cancel", kind: "无责取消", text: "免费等待结束且已联系，报备后取消" }]
        : [
            { t: "service", n: -2 },
            { t: "cancel", kind: "有责取消", text: "等待和联系还不够就取消" },
          ];
    case "wait-bail":
      return [{ t: "service", n: -3 }, { t: "cancel", kind: "有责取消", text: "未报备离开等待点" }];
    case "wait-sneak":
      return [
        { t: "service", n: -4 },
        { t: "quality", n: -2 },
        { t: "complaint" },
        { t: "illegal-wait" },
        { t: "toast", text: "没有同意就计费，收入里不会收下这笔等待费。" },
        { t: "close" },
      ];
    case "pax-report":
      return [{ t: "cancel", kind: "乘客取消", text: "乘客上车前取消，已报备" }];
    case "pax-chase":
      return [
        { t: "complaint" },
        { t: "service", n: -2 },
        { t: "cancel", kind: "乘客取消", text: "乘客已取消，追问引发投诉风险" },
      ];
    case "pax-fake":
      return [
        { t: "complaint" },
        { t: "service", n: -6 },
        { t: "cancel", kind: "有责取消", text: "人未上车却试图完单，被拦住" },
      ];
    case "restrict-talk":
      return [
        { t: "service", n: 1 },
        { t: "quality", n: 1 },
        { t: "delay", n: 4 },
        { t: "toast", text: "乘客同意改到能停的一侧。继续接驾。" },
        { t: "close" },
      ];
    case "restrict-cancel":
      return [{ t: "cancel", kind: "无责取消", text: "封路限行，如实报备后取消" }];
    case "restrict-silent":
      return [
        { t: "service", n: -3 },
        { t: "quality", n: -2 },
        { t: "complaint" },
        { t: "toast", text: "你改了点却没说。乘客那边已经不痛快。" },
        { t: "close" },
      ];
    case "toll-ask":
      return [
        { t: "toll", n: 8 },
        { t: "service", n: 1 },
        { t: "quality", n: 1 },
        { t: "toast", text: "乘客同意走收费路。附加费记在账单上，不进抽成。" },
        { t: "close" },
      ];
    case "toll-ground":
      return [
        { t: "ground", n: 3.2 },
        { t: "toast", text: "改走地面。慢一点，没有附加费。" },
        { t: "close" },
      ];
    case "toll-sneak":
      return [
        { t: "toll", n: 8 },
        { t: "service", n: -3 },
        { t: "quality", n: -2 },
        { t: "complaint" },
        { t: "toast", text: "先上了桥才说。附加费还在，信任掉了一截。" },
        { t: "close" },
      ];
    case "bat-charge":
      return [
        { t: "toast", text: "去江心充电站。听单先停。" },
        { t: "charge" },
      ];
    case "bat-short":
      return [
        { t: "battery-caution" },
        { t: "toast", text: "接下来只想跑短单。电量再低就得收车。" },
        { t: "close" },
      ];
    case "bat-push":
      return [
        { t: "battery-risk" },
        { t: "service", n: -1 },
        { t: "toast", text: "你还是把远单接上了。电会掉得更快。" },
        { t: "close" },
      ];
    case "rest4-ok":
    case "rest4-want":
      return [
        { t: "toast", text: choiceId === "rest4-want" ? "想再跑一单也没用，听单已被锁住。" : "收车休息。" },
        { t: "rest", tier: "4h", n: 20 },
      ];
    case "rest10-ok":
    case "rest10-want":
      return [
        {
          t: "toast",
          text: choiceId === "rest10-want" ? "计费时长已满，再想接单也会被拦住。" : "长休息开始。",
        },
        { t: "rest", tier: "10h", n: 360 },
      ];
    case "hosp-help":
      return [
        { t: "service", n: 2 },
        { t: "quality", n: 2 },
        { t: "toast", text: "车开得很稳。没有额外奖金，口碑好了一点。" },
        { t: "close" },
      ];
    case "hosp-normal":
      return [{ t: "toast", text: "平安送到医院门口。" }, { t: "close" }];
    case "hosp-rush":
      return [
        { t: "service", n: -3 },
        { t: "quality", n: -2 },
        { t: "complaint" },
        { t: "toast", text: "催促让乘客不舒服。" },
        { t: "close" },
      ];
    case "odor-air":
      return [
        { t: "service", n: 1 },
        { t: "quality", n: 1 },
        { t: "toast", text: "你通了风，也道了歉。首次异味反馈没有扣模拟收入。" },
        { t: "close" },
      ];
    case "odor-appeal":
      return [
        { t: "service", n: 1 },
        { t: "toast", text: "说明已留给平台。首次异味反馈没有扣模拟收入。" },
        { t: "close" },
      ];
    case "odor-argue":
      return [
        { t: "service", n: -3 },
        { t: "quality", n: -2 },
        { t: "complaint" },
        { t: "toast", text: "争吵升级成了投诉风险。收入仍没有因为异味本身被扣。" },
        { t: "close" },
      ];
    case "odor-cash":
      return [
        { t: "service", n: -4 },
        { t: "quality", n: -2 },
        { t: "complaint" },
        { t: "toast", text: "私下给钱解决不了反馈。模拟收入没有因此减少，投诉风险留下来了。" },
        { t: "close" },
      ];
    case "ac-yes":
      return [{ t: "service", n: 1 }, { t: "quality", n: 1 }, { t: "toast", text: "风量按乘客的意思调了。" }, { t: "close" }];
    case "ac-mid":
      return [{ t: "toast", text: "你们折中了一档。" }, { t: "close" }];
    case "ac-no":
      return [
        { t: "service", n: -2 },
        { t: "quality", n: -2 },
        { t: "complaint" },
        { t: "toast", text: "拒绝调节，乘客不高兴。" },
        { t: "close" },
      ];
    case "att-calm":
      return [{ t: "service", n: 1 }, { t: "quality", n: 1 }, { t: "toast", text: "语气放慢之后，车里安静了。" }, { t: "close" }];
    case "att-platform":
      return [{ t: "toast", text: "已请平台协助，双方先分开说。" }, { t: "close" }];
    case "att-snap":
      return [
        { t: "service", n: -3 },
        { t: "quality", n: -2 },
        { t: "complaint" },
        { t: "toast", text: "顶撞留下了投诉风险。" },
        { t: "close" },
      ];
    default:
      return [];
  }
}

export function eventResearch(id: EventId): string {
  const map: Record<EventId, string> = {
    drunk: "RESEARCH.md §4.1",
    child: "RESEARCH.md §4.2",
    "cant-find": "RESEARCH.md §4.3",
    "paid-wait": "RESEARCH.md §4.4",
    "pax-cancel": "RESEARCH.md §4.5",
    restriction: "RESEARCH.md §4.6",
    toll: "RESEARCH.md §4.7",
    battery: "RESEARCH.md §4.8",
    rest: "RESEARCH.md §4.9",
    hospital: "RESEARCH.md §4.10",
    complaint: "RESEARCH.md §4.11",
    platform: "RESEARCH.md §4.12",
  };
  return map[id];
}
