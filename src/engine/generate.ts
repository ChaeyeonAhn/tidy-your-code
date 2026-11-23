import { BALANCE } from "@/config/balance";
import { SNIPPETS } from "@/content/snippets";
import { INJECT_ORDER, RULES, checkAll } from "./rules";
import { mulberry32, shuffle } from "./rng";
import { leadingWs } from "./tokenize";
import type { Doc, RuleId } from "./types";

/** 2칸 기준 정답 소스를 원하는 들여쓰기 단위로 다시 그린다 */
export function render(src: string, unit: number): Doc {
  return src.split("\n").map((line) => {
    const t = line.trim();
    if (t === "") return "";
    const depth = Math.round(leadingWs(line).length / 2);
    return " ".repeat(depth * unit) + t;
  });
}

export function injectAll(target: Doc, rules: RuleId[], seed: number, perRule: number, minLine: number, unit: number): Doc {
  const rng = mulberry32(seed);
  let doc = target;
  for (const id of INJECT_ORDER) {
    if (!rules.includes(id)) continue;
    doc = RULES[id].inject(doc, rng, perRule, { minLine, maxCols: BALANCE.maxCols, unit });
  }
  return doc;
}

export interface RoundSpec {
  round: number;
  seed: number;
  rules: RuleId[];
  unit: number;
  speed: number;
  file: string;
  target: Doc;
  doc: Doc;
}

export function rulesFor(round: number, prevUnit: number, seed: number): { rules: RuleId[]; unit: number } {
  const sched = BALANCE.schedule[round - 1];
  if (sched) return { rules: sched, unit: 2 };
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const count = rng() < 0.5 ? 3 : 4;
  const rules = shuffle(rng, BALANCE.pool).slice(0, count);
  const flip = rules.includes("indent") && rng() < BALANCE.flipUnitChance;
  return { rules, unit: flip ? (prevUnit === 2 ? 4 : 2) : prevUnit };
}

export function buildRound(round: number, seed: number, prevUnit = 2): RoundSpec {
  const { rules, unit } = rulesFor(round, prevUnit, seed);
  const rng = mulberry32(seed);
  const perRule = BALANCE.injectPerRule(round, rules.length);
  const want = perRule * rules.length;
  // 스니펫마다 주입 후보 수가 달라서, 위반이 충분히 들어가는 스니펫을 고른다
  let best: RoundSpec | null = null;
  let bestCount = -1;
  for (const snip of shuffle(rng, SNIPPETS)) {
    const target = render(snip.src, unit);
    const doc = injectAll(target, rules, seed + 1, perRule, 1, unit);
    const count = checkAll(doc, rules, { target, unit }).length;
    if (count > bestCount) {
      best = { round, seed, rules, unit, speed: BALANCE.catSpeed(round), file: snip.file, target, doc };
      bestCount = count;
    }
    if (count >= want) break;
  }
  return best!;
}

/** 브리핑 ✗/✓ 예시, 연습 문제 */
export function buildExample(id: RuleId, unit: number, which: "example" | "practice") {
  const target = render(RULES[id][which], unit);
  const doc = injectAll(target, [id], which === "example" ? 7 : 11, 1, 0, unit);
  return { target, doc };
}
