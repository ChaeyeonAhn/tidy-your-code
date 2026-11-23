import type { RuleId } from "@/engine/types";

// 숫자는 전부 여기서 튜닝한다.
export const BALANCE = {
  hearts: 3,
  maxHearts: 3,
  countdown: 3, // 초
  maxCols: 40,

  /** 냥이 걷는 속도 (글자/초) */
  catSpeed: (round: number) => Math.min(6 + (round - 1) * 0.7, 14),
  hopDur: 0.4,
  emptyHopDur: 0.2,
  inspectDur: 1.1,

  /** 규칙 하나당 위반 개수 */
  injectPerRule: (round: number, ruleCount: number) =>
    ruleCount === 1 ? 3 + Math.floor(round / 3) : 2 + Math.floor(round / 4),

  /** 라운드별 규칙 (이후는 랜덤) */
  schedule: [
    ["lineBreak"],
    ["lineBreak", "braceStyle"],
    ["lineBreak", "braceStyle", "indent"],
    ["braceStyle", "indent", "spaceInfix"],
    ["indent", "spaceInfix", "semicolon"],
  ] as RuleId[][],
  pool: ["lineBreak", "braceStyle", "indent", "spaceInfix", "semicolon"] as RuleId[],

  /** 6라운드부터 냥이 변덕(2칸 ↔ 4칸) 확률 */
  flipUnitChance: 0.35,

  score: {
    cleanLine: 10,
    comboStep: 5, // 콤보 5마다 배율 +1
    roundClear: 50, // × 라운드
  },
};
