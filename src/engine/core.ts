import type { Cursor, Doc } from "./types";

/** 규칙 키로 넣고 뺄 수 있는 문자. 코어(불변 부분)에서 제외된다. */
export const RULE_CHARS = ";";

const isWs = (c: string) => c === " " || c === "\t";

/** 공백·규칙 문자를 뺀 코드. 플레이어가 무슨 짓을 해도 이 값은 변하지 않는다. */
export function strip(doc: Doc): string {
  let s = "";
  for (const line of doc) for (const c of line) if (!isWs(c) && !RULE_CHARS.includes(c)) s += c;
  return s;
}

export interface Anchors {
  /** 코어 문자 k번째 앞에 붙어 있는 ch 문자들의 위치 (k = 그 앞까지의 코어 문자 수) */
  at: Map<number, Cursor[]>;
  /** 코어 문자 위치 */
  corePos: Cursor[];
}

/** 규칙 문자를 코어 인덱스에 매단다. 공백이 어떻게 바뀌어도 같은 자리를 가리킨다. */
export function anchors(doc: Doc, ch: string): Anchors {
  const at = new Map<number, Cursor[]>();
  const corePos: Cursor[] = [];
  doc.forEach((line, li) => {
    for (let ci = 0; ci < line.length; ci++) {
      const c = line[ci];
      if (isWs(c)) continue;
      if (c === ch) {
        const k = corePos.length;
        if (!at.has(k)) at.set(k, []);
        at.get(k)!.push({ line: li, col: ci });
      } else if (!RULE_CHARS.includes(c)) {
        corePos.push({ line: li, col: ci });
      }
    }
  });
  return { at, corePos };
}
