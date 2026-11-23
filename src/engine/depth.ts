import { CLOSERS, OPENERS, codeTokens } from "./tokenize";
import type { Doc } from "./types";

/**
 * 줄마다 "있어야 할" 들여쓰기 깊이.
 * 열린 괄호들이 시작된 서로 다른 줄의 개수 = 깊이. (`feed(cat, () => {`처럼 한 줄에서 2개 열어도 +1)
 * 줄이 닫는 괄호로 시작하면 그 괄호들은 먼저 닫고 계산한다.
 */
export function lineDepths(doc: Doc): number[] {
  const stack: { ch: string; line: number }[] = [];
  const out: number[] = [];
  doc.forEach((line, i) => {
    const toks = codeTokens(line);
    let lead = 0;
    while (lead < toks.length && toks[lead].type === "punct" && CLOSERS.has(toks[lead].text)) lead++;
    const visible = stack.slice(0, Math.max(0, stack.length - lead));
    let depth = 0;
    let last = -1;
    for (const s of visible) {
      if (s.line !== last) {
        depth++;
        last = s.line;
      }
    }
    out.push(depth);
    for (const t of toks) {
      if (t.type !== "punct") continue;
      if (OPENERS.has(t.text)) stack.push({ ch: t.text, line: i });
      else if (CLOSERS.has(t.text)) stack.pop();
    }
  });
  return out;
}

/** 각 토큰 직전의 괄호 스택 꼭대기 (`;`가 for(...) 안인지 판단용) */
export function parenTopAt(doc: Doc): (line: number, col: number) => string | undefined {
  const tops = new Map<string, string | undefined>();
  const stack: string[] = [];
  doc.forEach((line, i) => {
    for (const t of codeTokens(line)) {
      tops.set(`${i}:${t.start}`, stack[stack.length - 1]);
      if (t.type !== "punct") continue;
      if (OPENERS.has(t.text)) stack.push(t.text);
      else if (CLOSERS.has(t.text)) stack.pop();
    }
  });
  return (line, col) => tops.get(`${line}:${col}`);
}
