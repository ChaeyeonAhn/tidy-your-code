import { pick } from "../rng";
import { VALUE_KEYWORDS, codeTokens, type Tok } from "../tokenize";
import type { Doc, Violation } from "../types";
import { replaceLine, type RuleDef } from "./types";

const INFIX = new Set([
  "=", "===", "!==", "==", "!=", "<", ">", "<=", ">=",
  "+", "-", "*", "/", "%", "**", "&&", "||", "??", "+=", "-=", "*=", "/=", "%=", "=>",
]);

const isValue = (t: Tok) =>
  t.type === "ident" || t.type === "num" || t.type === "str" ||
  (t.type === "kw" && VALUE_KEYWORDS.has(t.text)) ||
  (t.type === "punct" && (t.text === ")" || t.text === "]"));

/** 이항 연산자 토큰 (앞에 값이 있고 뒤에 뭔가 있는 것) */
function infixOps(line: string): Tok[] {
  const toks = codeTokens(line);
  return toks.filter((t, i) => t.type === "op" && INFIX.has(t.text) && i > 0 && isValue(toks[i - 1]) && i < toks.length - 1);
}

const spacedOk = (line: string, t: Tok) =>
  line[t.start - 1] === " " && line[t.start - 2] !== " " && line[t.end] === " " && line[t.end + 1] !== " ";

export const spaceInfix: RuleDef = {
  id: "spaceInfix",
  label: () => "= + - 양옆 띄기",
  plain: () => "= + - 같은 기호 양옆은 한 칸씩 띄워라냥. 딱 한 칸이다냥",
  keys: ["space", "backspace"],
  chars: "",
  check(doc) {
    const out: Violation[] = [];
    doc.forEach((line, li) => {
      for (const t of infixOps(line)) if (!spacedOk(line, t)) out.push({ line: li, col: t.start, ruleId: "spaceInfix" });
    });
    return out;
  },
  inject(doc: Doc, rng, n, { minLine, maxCols }) {
    let d = doc;
    for (let k = 0; k < n; k++) {
      const cands: { i: number; t: Tok }[] = [];
      for (let i = Math.max(0, minLine); i < d.length; i++) {
        for (const t of infixOps(d[i])) if (spacedOk(d[i], t)) cands.push({ i, t });
      }
      if (!cands.length) break;
      const { i, t } = pick(rng, cands);
      const line = d[i];
      const L = line.slice(0, t.start - 1);
      const R = line.slice(t.end + 1);
      const variants = [
        L + t.text + R, // a=b
        L + t.text + " " + R, // a= b
        L + " " + t.text + R, // a =b
        L + " " + t.text + "  " + R, // a =  b
      ].filter((v) => v.length <= maxCols);
      d = replaceLine(d, i, pick(rng, variants));
    }
    return d;
  },
  example: "let fish = 3 + 2;",
  practice: "cat.mood = 10;",
  scolds: ["기호가 답답하다냥! 띄워라냥", "한 칸이다냥. 딱 한 칸", "= 옆에 숨 쉴 틈을 줘라냥"],
};
