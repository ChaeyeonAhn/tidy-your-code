import { BALANCE } from "@/config/balance";
import { firstCol } from "./tokenize";
import type { Doc, Violation } from "./types";

export type CatPhase = "idle" | "hop" | "walk" | "inspect" | "sit";

export interface Cat {
  phase: CatPhase;
  /** 지금 올라서 있는(또는 점프해 가는) 줄. 이 줄까지 잠긴다 */
  line: number;
  col: number;
  /** 점프 출발점 */
  from: { line: number; col: number };
  /** 현재 phase 진행 시간 / 길이 */
  t: number;
  dur: number;
  /** 아직 밟지 않은 위반 */
  pending: Violation[];
  /** 이 줄의 모든 위반 */
  lineViol: Violation[];
  /** 이 줄에서 이미 냥펀치를 날렸는지 */
  flagged: boolean;
}

export type CatEvent =
  | { type: "violation"; v: Violation; first: boolean }
  | { type: "line"; line: number; clean: boolean; viol: Violation[] }
  | { type: "done" };

export const initialCat = (): Cat => ({
  phase: "idle",
  line: -1,
  col: 0,
  from: { line: -1, col: 0 },
  t: 0,
  dur: 0,
  pending: [],
  lineViol: [],
  flagged: false,
});

function hopTo(cat: Cat, doc: Doc, line: number): Cat {
  if (line >= doc.length) return { ...cat, phase: "sit", t: 0 };
  const empty = doc[line].trim() === "";
  return {
    ...cat,
    phase: "hop",
    from: { line: cat.line, col: cat.col },
    line,
    col: firstCol(doc[line]),
    t: 0,
    dur: empty ? BALANCE.emptyHopDur : BALANCE.hopDur,
    pending: [],
    lineViol: [],
    flagged: false,
  };
}

export function startCat(doc: Doc): Cat {
  return hopTo(initialCat(), doc, 0);
}

/**
 * 냥이를 dt초만큼 움직인다. 큰 dt에도 위반을 건너뛰지 않도록 구간 단위로 처리.
 * checkLine은 착지 순간 한 번 호출된다 (그 줄은 이미 잠겨 있으니 결과가 바뀌지 않음).
 */
export function stepCat(
  cat: Cat,
  doc: Doc,
  dt: number,
  speed: number,
  checkLine: (line: number) => Violation[],
): { cat: Cat; events: CatEvent[] } {
  const events: CatEvent[] = [];
  let c = cat;
  let left = dt;
  let guard = 0;
  while (left > 0 && guard++ < 200) {
    if (c.phase === "idle" || c.phase === "sit") break;

    if (c.phase === "hop") {
      const need = c.dur - c.t;
      if (left < need) {
        c = { ...c, t: c.t + left };
        left = 0;
        break;
      }
      left -= need;
      const viol = checkLine(c.line);
      c = { ...c, phase: "walk", t: 0, lineViol: viol, pending: [...viol], flagged: false };
      continue;
    }

    if (c.phase === "inspect") {
      const need = c.dur - c.t;
      if (left < need) {
        c = { ...c, t: c.t + left };
        left = 0;
        break;
      }
      left -= need;
      c = { ...c, phase: "walk", t: 0 };
      continue;
    }

    // walk
    const end = doc[c.line].trimEnd().length;
    const next = c.pending[0];
    const stop = next ? Math.max(c.col, Math.min(next.col, end)) : end;
    const need = (stop - c.col) / speed;
    if (left < need) {
      c = { ...c, col: c.col + left * speed };
      left = 0;
      break;
    }
    left -= need;
    c = { ...c, col: stop };
    if (next) {
      const first = !c.flagged;
      events.push({ type: "violation", v: next, first });
      c = { ...c, pending: c.pending.slice(1), flagged: true };
      if (first) c = { ...c, phase: "inspect", t: 0, dur: BALANCE.inspectDur };
      continue;
    }
    events.push({ type: "line", line: c.line, clean: c.lineViol.length === 0, viol: c.lineViol });
    c = hopTo(c, doc, c.line + 1);
    if (c.phase === "sit") {
      events.push({ type: "done" });
      break;
    }
  }
  return { cat: c, events };
}

/** 렌더링용 위치 (줄, 열 단위 실수). 점프는 포물선 */
export function catPose(cat: Cat): { line: number; col: number; lift: number; facing: 1 | -1 } {
  if (cat.phase === "hop") {
    const p = cat.dur > 0 ? Math.min(1, cat.t / cat.dur) : 1;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    return {
      line: cat.from.line + (cat.line - cat.from.line) * e,
      col: cat.from.col + (cat.col - cat.from.col) * e,
      lift: Math.sin(Math.PI * p),
      facing: cat.col < cat.from.col ? -1 : 1,
    };
  }
  return { line: cat.line, col: cat.col, lift: 0, facing: 1 };
}
