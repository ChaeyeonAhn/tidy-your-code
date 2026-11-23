import { anchors } from "../core";
import { parenTopAt } from "../depth";
import { pick } from "../rng";
import { codeTokens } from "../tokenize";
import type { Violation } from "../types";
import { replaceLine, type RuleDef } from "./types";

/**
 * `;`는 정답과 같은 자리(코어 인덱스 기준)에 같은 개수만큼 있어야 한다.
 * 공백·줄바꿈을 어떻게 바꿨든 상관없이 "어느 코드 뒤에 붙는지"로 비교한다.
 */
export const semicolon: RuleDef = {
  id: "semicolon",
  label: () => "; 필수",
  plain: () => "문장 끝에는 ; 가 꼭 있어야 한다냥. 두 개도 안 된다냥",
  keys: [";", "backspace"],
  chars: ";",
  check(doc, { target }) {
    const want = anchors(target, ";");
    const have = anchors(doc, ";");
    const out: Violation[] = [];
    const keys = new Set([...want.at.keys(), ...have.at.keys()]);
    for (const k of keys) {
      const req = want.at.get(k)?.length ?? 0;
      const got = have.at.get(k) ?? [];
      if (got.length < req) {
        const prev = have.corePos[k - 1];
        if (prev) out.push({ line: prev.line, col: prev.col + 1, ruleId: "semicolon" });
      } else if (got.length > req) {
        for (const p of got.slice(req)) out.push({ line: p.line, col: p.col, ruleId: "semicolon" });
      }
    }
    return out;
  },
  inject(doc, rng, n, { minLine, maxCols }) {
    let d = doc;
    const used = new Set<number>();
    for (let k = 0; k < n; k++) {
      const top = parenTopAt(d);
      const cands: number[] = [];
      for (let i = Math.max(0, minLine); i < d.length; i++) {
        if (used.has(i)) continue;
        const toks = codeTokens(d[i]);
        const last = toks[toks.length - 1];
        if (!last || last.text !== ";" || top(i, last.start) === "(") continue;
        cands.push(i);
      }
      if (!cands.length) break;
      const i = pick(rng, cands);
      const toks = codeTokens(d[i]);
      const last = toks[toks.length - 1];
      const line = d[i];
      const doubled = line.slice(0, last.end) + ";" + line.slice(last.end);
      const removed = line.slice(0, last.start) + line.slice(last.end);
      d = replaceLine(d, i, rng() < 0.3 && doubled.length <= maxCols ? doubled : removed);
      used.add(i);
    }
    return d;
  },
  example: "cat.meow();",
  practice: "bowl.fill(fish);",
  scolds: ["; 어디 갔냥?!", "세미콜론 빠졌다냥!!", ";; 두 개는 뭐냥"],
};
