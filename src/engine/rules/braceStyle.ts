import { pick } from "../rng";
import { codeTokens } from "../tokenize";
import type { Violation } from "../types";
import type { RuleDef } from "./types";

/** `{` 뒤에 같은 줄 코드 금지, `}` 앞에 같은 줄 코드 금지 */
export const braceStyle: RuleDef = {
  id: "braceStyle",
  label: () => "{ } 줄바꿈",
  plain: () => "{ 뒤랑 } 앞에서는 줄을 바꿔라냥",
  keys: ["enter"],
  chars: "",
  check(doc) {
    const out: Violation[] = [];
    doc.forEach((line, li) => {
      const toks = codeTokens(line);
      toks.forEach((t, ti) => {
        if (t.type !== "punct") return;
        if (t.text === "{" && ti < toks.length - 1) out.push({ line: li, col: t.end, ruleId: "braceStyle" });
        if (t.text === "}" && ti > 0) out.push({ line: li, col: t.start, ruleId: "braceStyle" });
      });
    });
    return out;
  },
  inject(doc, rng, n, { minLine, maxCols }) {
    let d = doc;
    for (let k = 0; k < n; k++) {
      // 블록 [i: `... {`, i+1: 본문 한 줄, i+2: `}...`]을 접는 세 가지 방법
      const cands: { i: number; lines: string[] }[] = [];
      for (let i = Math.max(0, minLine); i < d.length - 2; i++) {
        const a = codeTokens(d[i]);
        const body = codeTokens(d[i + 1]);
        const c = codeTokens(d[i + 2]);
        if (!a.length || !body.length || !c.length) continue;
        if (a[a.length - 1].text !== "{" || a.slice(0, -1).some((t) => t.text === "{" || t.text === "}")) continue;
        if (body.some((t) => t.text === "{" || t.text === "}")) continue;
        if (c[0].text !== "}") continue;
        const [A, B, C] = [d[i], d[i + 1], d[i + 2]];
        const variants = [
          [`${A} ${B.trim()} ${C.trim()}`], // if (x) { y(); }
          [`${A} ${B.trim()}`, C], // if (x) { y();
          [A, `${B} ${C.trim()}`], //   y(); }
        ].filter((v) => v.every((l) => l.length <= maxCols));
        for (const lines of variants) cands.push({ i, lines });
      }
      if (!cands.length) break;
      const { i, lines } = pick(rng, cands);
      d = [...d.slice(0, i), ...lines, ...d.slice(i + 3)];
    }
    return d;
  },
  example: "if (hungry) {\n  meow();\n}",
  practice: "if (sleepy) {\n  nap();\n}",
  scolds: ["중괄호가 숨을 못 쉰다냥!", "{ 다음엔 엔터다냥", "블록을 한 줄에 우겨넣지 마라냥"],
};
