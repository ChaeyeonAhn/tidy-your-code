import { lineDepths } from "../depth";
import { pick } from "../rng";
import { leadingWs } from "../tokenize";
import type { Violation } from "../types";
import { replaceLine, type RuleDef } from "./types";

/** 앞쪽 공백 = unit × 깊이. 빈 줄은 검사하지 않는다 */
export const indent: RuleDef = {
  id: "indent",
  label: (u) => `들여쓰기 ${u}칸`,
  plain: (u) => `{ 안쪽 줄은 ${u}칸씩 더 들어가야 한다냥. ⇥ 한 번 = ${u}칸`,
  keys: ["tab", "backspace"],
  chars: "",
  check(doc, { unit }) {
    const depths = lineDepths(doc);
    const out: Violation[] = [];
    doc.forEach((line, li) => {
      if (line.trim() === "") return;
      if (leadingWs(line) !== " ".repeat(unit * depths[li])) out.push({ line: li, col: 0, ruleId: "indent" });
    });
    return out;
  },
  inject(doc, rng, n, { minLine, maxCols, unit }) {
    let d = doc;
    const depths = lineDepths(doc);
    const deltas = unit === 4 ? [1, 2, 3, -1, -2, -3] : [1, 2, -1];
    const used = new Set<number>();
    for (let k = 0; k < n; k++) {
      const cands: number[] = [];
      for (let i = Math.max(0, minLine); i < d.length; i++) {
        if (used.has(i) || d[i].trim() === "") continue;
        if (leadingWs(d[i]) !== " ".repeat(unit * depths[i])) continue;
        cands.push(i);
      }
      if (!cands.length) break;
      const i = pick(rng, cands);
      const cur = unit * depths[i];
      const ok = deltas.filter((x) => cur + x >= 0 && cur + x + d[i].trim().length <= maxCols);
      if (!ok.length) break;
      const next = cur + pick(rng, ok);
      d = replaceLine(d, i, " ".repeat(next) + d[i].trim());
      used.add(i);
    }
    return d;
  },
  example: "if (hungry) {\n  meow();\n}",
  practice: "while (awake) {\n  play();\n}",
  scolds: ["들여쓰기가 삐뚤다냥!!", "발 디딜 자리가 이상하다냥", "칸 수 세어봐라냥"],
};
