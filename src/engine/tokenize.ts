// JS 부분집합 토크나이저. 스니펫은 템플릿 리터럴·정규식·여러 줄 주석을 쓰지 않으므로 줄 단위로 충분하다.

export type TokType = "kw" | "ident" | "num" | "str" | "comment" | "op" | "punct";

export interface Tok {
  type: TokType;
  text: string;
  start: number;
  end: number;
}

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "of", "in", "class", "new", "this", "true", "false", "null", "undefined",
  "typeof", "break", "continue",
]);

// 값처럼 동작하는 키워드 (뒤에 오는 연산자는 이항 연산자)
export const VALUE_KEYWORDS = new Set(["this", "true", "false", "null", "undefined"]);

// 긴 것부터 매칭
const OPS = [
  "===", "!==", "...", "**=",
  "=>", "==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=", "**", "??", "?.",
  "+", "-", "*", "/", "%", "=", "<", ">", "!", "&", "|", "?", ":", ".", "^", "~",
];

const PUNCT = new Set(["(", ")", "{", "}", "[", "]", ";", ","]);

export const OPENERS = new Set(["(", "{", "["]);
export const CLOSERS = new Set([")", "}", "]"]);

const cache = new Map<string, Tok[]>();

export function tokenizeLine(line: string): Tok[] {
  const hit = cache.get(line);
  if (hit) return hit;
  const toks: Tok[] = [];
  let i = 0;
  const n = line.length;
  while (i < n) {
    const c = line[i];
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    const start = i;
    if (c === "/" && line[i + 1] === "/") {
      toks.push({ type: "comment", text: line.slice(i), start, end: n });
      break;
    }
    if (c === "'" || c === '"') {
      i++;
      while (i < n && line[i] !== c) {
        if (line[i] === "\\") i++;
        i++;
      }
      i = Math.min(i + 1, n);
      toks.push({ type: "str", text: line.slice(start, i), start, end: i });
      continue;
    }
    if (/[0-9]/.test(c)) {
      while (i < n && /[0-9._]/.test(line[i])) i++;
      toks.push({ type: "num", text: line.slice(start, i), start, end: i });
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      while (i < n && /[\w$]/.test(line[i])) i++;
      const text = line.slice(start, i);
      toks.push({ type: KEYWORDS.has(text) ? "kw" : "ident", text, start, end: i });
      continue;
    }
    if (PUNCT.has(c)) {
      toks.push({ type: "punct", text: c, start, end: i + 1 });
      i++;
      continue;
    }
    const op = OPS.find((o) => line.startsWith(o, i));
    if (op) {
      toks.push({ type: "op", text: op, start, end: i + op.length });
      i += op.length;
      continue;
    }
    toks.push({ type: "punct", text: c, start, end: i + 1 });
    i++;
  }
  if (cache.size > 2000) cache.clear();
  cache.set(line, toks);
  return toks;
}

/** 주석 제외 토큰 */
export function codeTokens(line: string): Tok[] {
  return tokenizeLine(line).filter((t) => t.type !== "comment");
}

/** col이 어떤 토큰의 "안쪽"(경계 제외)에 있는지 */
export function tokenAround(line: string, col: number): Tok | undefined {
  return tokenizeLine(line).find((t) => t.start < col && col < t.end);
}

/** 탭 위치를 스냅할 수 있는 경계들 */
export function boundaries(line: string): number[] {
  const set = new Set<number>([line.length]);
  for (const t of tokenizeLine(line)) {
    set.add(t.start);
    set.add(t.end);
  }
  if (line.trim() === "") set.add(0);
  return [...set].sort((a, b) => a - b);
}

export function snapCol(line: string, rawCol: number): number {
  let best = line.length;
  let bestD = Infinity;
  for (const b of boundaries(line)) {
    const d = Math.abs(b - rawCol);
    if (d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

export function leadingWs(line: string): string {
  return /^[ \t]*/.exec(line)![0];
}

export function firstCol(line: string): number {
  return line.trim() === "" ? line.length : leadingWs(line).length;
}
