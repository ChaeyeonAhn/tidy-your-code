import { lineDepths } from "./depth";
import { firstCol, leadingWs, tokenAround, tokenizeLine } from "./tokenize";
import type { Cursor, Doc, KeyId } from "./types";

export interface EditCtx {
  /** 들여쓰기 한 단위 */
  unit: number;
  /** ⌫로 지울 수 있는 규칙 문자 */
  deletable: string;
  /** 이 줄부터 편집 가능 (위는 냥이가 지나가서 잠김) */
  minLine: number;
}

export type EditResult = { doc: Doc; cursor: Cursor } | null;

const set = (doc: Doc, i: number, line: string) => doc.map((l, j) => (j === i ? line : l));

/** 토큰 한가운데에는 아무것도 끼워 넣을 수 없다 (식별자를 쪼개는 건 정리가 아니니까) */
const insideToken = (line: string, col: number) => tokenAround(line, col) !== undefined;

function insert(doc: Doc, cur: Cursor, text: string, ctx: EditCtx): EditResult {
  const line = doc[cur.line];
  if (cur.line < ctx.minLine || insideToken(line, cur.col)) return null;
  return {
    doc: set(doc, cur.line, line.slice(0, cur.col) + text + line.slice(cur.col)),
    cursor: { line: cur.line, col: cur.col + text.length },
  };
}

/** VSCode식 엔터: 양쪽 공백을 정리하고 새 줄을 올바른 깊이로 들여쓴다 */
export function newline(doc: Doc, cur: Cursor, ctx: EditCtx): EditResult {
  const line = doc[cur.line];
  if (cur.line < ctx.minLine || insideToken(line, cur.col)) return null;
  const left = line.slice(0, cur.col).replace(/[ \t]+$/, "");
  const right = line.slice(cur.col).replace(/^[ \t]+/, "");
  const draft = [...doc.slice(0, cur.line), left, right, ...doc.slice(cur.line + 1)];
  const pad = " ".repeat(ctx.unit * lineDepths(draft)[cur.line + 1]);
  draft[cur.line + 1] = pad + right;
  return { doc: draft, cursor: { line: cur.line + 1, col: pad.length } };
}

/** 다음 탭 스톱까지 공백 */
export function tab(doc: Doc, cur: Cursor, ctx: EditCtx): EditResult {
  return insert(doc, cur, " ".repeat(ctx.unit - (cur.col % ctx.unit)), ctx);
}

export function space(doc: Doc, cur: Cursor, ctx: EditCtx): EditResult {
  return insert(doc, cur, " ", ctx);
}

export function insertChar(doc: Doc, cur: Cursor, ch: string, ctx: EditCtx): EditResult {
  return insert(doc, cur, ch, ctx);
}

/** 공백과 규칙 문자만 지운다. 앞쪽 공백에서는 이전 탭 스톱까지 */
export function backspace(doc: Doc, cur: Cursor, ctx: EditCtx): EditResult {
  const line = doc[cur.line];
  if (cur.line < ctx.minLine) return null;
  if (cur.col === 0) {
    if (cur.line - 1 < ctx.minLine) return null;
    const prev = doc[cur.line - 1];
    return {
      doc: [...doc.slice(0, cur.line - 1), prev + line, ...doc.slice(cur.line + 1)],
      cursor: { line: cur.line - 1, col: prev.length },
    };
  }
  const ch = line[cur.col - 1];
  const inLeading = cur.col <= leadingWs(line).length;
  let n = 0;
  if (inLeading && ch === " ") {
    const back = ((cur.col - 1) % ctx.unit) + 1;
    while (n < back && line[cur.col - 1 - n] === " ") n++;
  } else if (ch === " " || ch === "\t") {
    const i = cur.col - 1;
    const tok = tokenizeLine(line).find((t) => t.start <= i && i < t.end);
    if (tok && (tok.type === "str" || tok.type === "comment")) return null;
    n = 1;
  } else if (ctx.deletable.includes(ch)) {
    n = 1;
  } else {
    return null;
  }
  return {
    doc: set(doc, cur.line, line.slice(0, cur.col - n) + line.slice(cur.col)),
    cursor: { line: cur.line, col: cur.col - n },
  };
}

export function move(doc: Doc, cur: Cursor, key: "left" | "right" | "up" | "down", minLine: number): Cursor {
  const lo = Math.min(minLine, doc.length - 1);
  if (key === "left") {
    if (cur.col > 0) return { ...cur, col: cur.col - 1 };
    if (cur.line > lo) return { line: cur.line - 1, col: doc[cur.line - 1].length };
    return cur;
  }
  if (key === "right") {
    if (cur.col < doc[cur.line].length) return { ...cur, col: cur.col + 1 };
    if (cur.line < doc.length - 1) return { line: cur.line + 1, col: firstCol(doc[cur.line + 1]) };
    return cur;
  }
  const line = Math.max(lo, Math.min(doc.length - 1, cur.line + (key === "up" ? -1 : 1)));
  return { line, col: Math.min(cur.col, doc[line].length) };
}

export function applyKey(doc: Doc, cur: Cursor, key: KeyId, ctx: EditCtx): EditResult {
  switch (key) {
    case "enter":
      return newline(doc, cur, ctx);
    case "tab":
      return tab(doc, cur, ctx);
    case "space":
      return space(doc, cur, ctx);
    case "backspace":
      return backspace(doc, cur, ctx);
    case ";":
      return insertChar(doc, cur, key, ctx);
    default:
      return { doc, cursor: move(doc, cur, key, ctx.minLine) };
  }
}
