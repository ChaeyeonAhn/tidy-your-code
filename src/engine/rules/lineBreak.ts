import { lineDepths, parenTopAt } from "../depth";
import { pick } from "../rng";
import { CLOSERS, codeTokens } from "../tokenize";
import type { Violation } from "../types";
import type { RuleDef } from "./types";

/** `;` 뒤에 같은 줄에 코드가 더 있으면 위반. for (...) 안의 `;`는 제외 */
export const lineBreak: RuleDef = {
  id: "lineBreak",
  label: () => "한 줄에 하나",
  plain: () => "; 뒤에 글자가 더 있으면 줄을 바꿔라냥",
  keys: ["enter"],
  chars: "",
  check(doc) {
    const top = parenTopAt(doc);
    const out: Violation[] = [];
    doc.forEach((line, li) => {
      const toks = codeTokens(line);
      toks.forEach((t, ti) => {
        if (t.text !== ";" || t.type !== "punct") return;
        if (top(li, t.start) === "(") return;
        const next = toks[ti + 1];
        if (next) out.push({ line: li, col: t.end, ruleId: "lineBreak" });
      });
    });
    return out;
  },
  inject(doc, rng, n, { minLine, maxCols }) {
    let d = doc;
    for (let k = 0; k < n; k++) {
      const depths = lineDepths(d);
      const top = parenTopAt(d);
      const cands: number[] = [];
      for (let i = Math.max(0, minLine); i < d.length - 1; i++) {
        const a = codeTokens(d[i]);
        const b = codeTokens(d[i + 1]);
        if (!a.length || !b.length) continue;
        const aLast = a[a.length - 1];
        const bLast = b[b.length - 1];
        if (aLast.text !== ";" || top(i, aLast.start) === "(") continue;
        if (bLast.text !== ";") continue;
        if (CLOSERS.has(b[0].text)) continue;
        if (b.some((t) => t.text === "{" || t.text === "}")) continue;
        if (depths[i] !== depths[i + 1]) continue;
        if ((d[i] + " " + d[i + 1].trim()).length > maxCols) continue;
        cands.push(i);
      }
      if (!cands.length) break;
      const i = pick(rng, cands);
      d = [...d.slice(0, i), d[i] + " " + d[i + 1].trim(), ...d.slice(i + 2)];
    }
    return d;
  },
  example: "cat.sit();\ncat.purr();",
  practice: "bowl.fill();\ncat.eat();",
  scolds: ["한 줄에 두 개?! 줄 바꿔라냥", "숨 막힌다냥. 엔터 몰라냥?", "한 줄에 하나만 하라냥!!"],
};
