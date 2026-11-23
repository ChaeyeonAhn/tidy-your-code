import { BALANCE } from "@/config/balance";
import { initialCat, startCat, stepCat, type Cat } from "./cat";
import { applyKey } from "./doc";
import { buildExample, buildRound, type RoundSpec } from "./generate";
import { RULES, checkAll, checkLine, ruleChars } from "./rules";
import { firstCol, snapCol } from "./tokenize";
import type { Cursor, Doc, KeyId, RuleId, Violation } from "./types";

export type Phase = "title" | "briefing" | "countdown" | "playing" | "clear" | "over";

export interface LineMark {
  clean: boolean;
  viol: Violation[];
}

export interface Briefing {
  queue: RuleId[];
  idx: number;
  example: { target: Doc; doc: Doc };
  practice: { target: Doc; doc: Doc; cursor: Cursor; solved: boolean };
  needPractice: boolean;
  /** 냥이 변덕으로 다시 보는 규칙인지 */
  changed: boolean;
}

export interface GameState {
  phase: Phase;
  round: number;
  hearts: number;
  score: number;
  combo: number;
  best: number;
  seen: RuleId[];
  spec: RoundSpec | null;
  prevRules: RuleId[];
  prevUnit: number;
  doc: Doc;
  cursor: Cursor;
  cat: Cat;
  marks: Record<number, LineMark>;
  countdown: number;
  scold: { text: string; line: number; col: number; ttl: number } | null;
  overIn: number | null;
  /** 거부된 입력 횟수 (UI 흔들기 트리거) */
  rejects: number;
  /** 혼난 횟수 (진동 트리거) */
  hits: number;
  stats: { clean: number; bad: number };
  perfect: boolean;
  briefing: Briefing | null;
}

export type Action =
  | { type: "LOAD"; best: number; seen: RuleId[] }
  | { type: "START"; seed: number }
  | { type: "TICK"; dt: number }
  | { type: "KEY"; key: KeyId }
  | { type: "TAP"; line: number; col: number }
  | { type: "BRIEF_NEXT" }
  | { type: "NEXT_ROUND"; seed: number }
  | { type: "TO_TITLE" };

export const initialState: GameState = {
  phase: "title",
  round: 0,
  hearts: BALANCE.hearts,
  score: 0,
  combo: 0,
  best: 0,
  seen: [],
  spec: null,
  prevRules: [],
  prevUnit: 2,
  doc: [],
  cursor: { line: 0, col: 0 },
  cat: initialCat(),
  marks: {},
  countdown: 0,
  scold: null,
  overIn: null,
  rejects: 0,
  hits: 0,
  stats: { clean: 0, bad: 0 },
  perfect: false,
  briefing: null,
};

/** 지금 편집 중인 대상의 키 바 구성 */
export function keysFor(s: GameState): KeyId[] {
  const base: KeyId[] = ["left", "right", "enter", "tab", "backspace", "space"];
  const rules = s.phase === "briefing" && s.briefing ? [s.briefing.queue[s.briefing.idx]] : (s.spec?.rules ?? []);
  return ruleChars(rules).includes(";") ? [...base, ";"] : base;
}

export const minLineOf = (s: GameState) => s.cat.line + 1;

function makeBriefing(rule: RuleId, queue: RuleId[], idx: number, unit: number, seen: RuleId[], changed: boolean): Briefing {
  const example = buildExample(rule, unit, "example");
  const p = buildExample(rule, unit, "practice");
  return {
    queue,
    idx,
    example,
    practice: { target: p.target, doc: p.doc, cursor: { line: 0, col: firstCol(p.doc[0]) }, solved: false },
    needPractice: !seen.includes(rule) || changed,
    changed,
  };
}

function enterRound(s: GameState, round: number, seed: number): GameState {
  const spec = buildRound(round, seed, s.prevUnit);
  const unitChanged = spec.unit !== s.prevUnit && s.prevRules.includes("indent");
  const fresh = spec.rules.filter((r) => !s.prevRules.includes(r) || (r === "indent" && unitChanged));
  const next: GameState = {
    ...s,
    round,
    spec,
    doc: spec.doc,
    cursor: { line: 0, col: firstCol(spec.doc[0]) },
    cat: initialCat(),
    marks: {},
    scold: null,
    overIn: null,
    combo: s.combo,
    stats: { clean: 0, bad: 0 },
    perfect: false,
    countdown: BALANCE.countdown,
    briefing: null,
  };
  if (fresh.length) {
    return {
      ...next,
      phase: "briefing",
      briefing: makeBriefing(fresh[0], fresh, 0, spec.unit, s.seen, fresh[0] === "indent" && unitChanged),
    };
  }
  return { ...next, phase: "countdown" };
}

function ctxOf(s: GameState) {
  return { target: s.spec!.target, unit: s.spec!.unit };
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case "LOAD":
      return { ...s, best: a.best, seen: a.seen };

    case "START":
      return enterRound(
        { ...s, hearts: BALANCE.hearts, score: 0, combo: 0, prevRules: [], prevUnit: 2 },
        1,
        a.seed,
      );

    case "NEXT_ROUND":
      if (s.phase !== "clear" || !s.spec) return s;
      return enterRound({ ...s, prevRules: s.spec.rules, prevUnit: s.spec.unit }, s.round + 1, a.seed);

    case "TO_TITLE":
      return { ...initialState, best: s.best, seen: s.seen };

    case "BRIEF_NEXT": {
      const b = s.briefing;
      if (s.phase !== "briefing" || !b || !s.spec) return s;
      if (b.needPractice && !b.practice.solved) return s;
      const rule = b.queue[b.idx];
      const seen = s.seen.includes(rule) ? s.seen : [...s.seen, rule];
      if (b.idx + 1 < b.queue.length) {
        const nextRule = b.queue[b.idx + 1];
        return { ...s, seen, briefing: makeBriefing(nextRule, b.queue, b.idx + 1, s.spec.unit, seen, false) };
      }
      return { ...s, seen, phase: "countdown", briefing: null };
    }

    case "TAP": {
      if (s.phase === "briefing" && s.briefing) {
        const b = s.briefing;
        const line = Math.max(0, Math.min(b.practice.doc.length - 1, a.line));
        const cursor = { line, col: snapCol(b.practice.doc[line], a.col) };
        return { ...s, briefing: { ...b, practice: { ...b.practice, cursor } } };
      }
      if (s.phase !== "playing" && s.phase !== "countdown") return s;
      if (a.line < minLineOf(s) || a.line >= s.doc.length) return { ...s, rejects: s.rejects + 1 };
      return { ...s, cursor: { line: a.line, col: snapCol(s.doc[a.line], a.col) } };
    }

    case "KEY": {
      if (s.phase === "briefing" && s.briefing && s.spec) {
        const b = s.briefing;
        const rule = b.queue[b.idx];
        if (!keysFor(s).includes(a.key) && !["up", "down"].includes(a.key)) return s;
        const r = applyKey(b.practice.doc, b.practice.cursor, a.key, {
          unit: s.spec.unit,
          deletable: RULES[rule].chars,
          minLine: 0,
        });
        if (!r) return { ...s, rejects: s.rejects + 1 };
        const solved = checkAll(r.doc, [rule], { target: b.practice.target, unit: s.spec.unit }).length === 0;
        return { ...s, briefing: { ...b, practice: { ...b.practice, doc: r.doc, cursor: r.cursor, solved } } };
      }
      if ((s.phase !== "playing" && s.phase !== "countdown") || !s.spec) return s;
      if (!keysFor(s).includes(a.key) && !["up", "down"].includes(a.key)) return s;
      const r = applyKey(s.doc, s.cursor, a.key, {
        unit: s.spec.unit,
        deletable: ruleChars(s.spec.rules),
        minLine: minLineOf(s),
      });
      if (!r) return { ...s, rejects: s.rejects + 1 };
      return { ...s, doc: r.doc, cursor: r.cursor };
    }

    case "TICK":
      return tick(s, a.dt);
  }
}

function tick(s: GameState, dt: number): GameState {
  let n = s;
  if (n.scold) n = { ...n, scold: n.scold.ttl - dt > 0 ? { ...n.scold, ttl: n.scold.ttl - dt } : null };

  if (n.phase === "countdown") {
    const c = n.countdown - dt;
    if (c > 0) return { ...n, countdown: c };
    return { ...n, countdown: 0, phase: "playing", cat: startCat(n.doc) };
  }

  if (n.phase !== "playing" || !n.spec) return n;

  if (n.overIn !== null) {
    const o = n.overIn - dt;
    if (o <= 0) return { ...n, phase: "over", overIn: null, best: Math.max(n.best, n.score) };
    n = { ...n, overIn: o };
  }

  const spec = n.spec!;
  const ctx = ctxOf(n);
  const rules = spec.rules;
  const doc = n.doc;
  const { cat, events } = stepCat(n.cat, doc, dt, spec.speed, (line) => checkLine(doc, line, rules, ctx));
  n = { ...n, cat };

  for (const e of events) {
    if (e.type === "violation" && e.first) {
      const def = RULES[e.v.ruleId];
      const text = def.scolds[(e.v.line + n.round) % def.scolds.length];
      const hearts = n.hearts - 1;
      n = {
        ...n,
        hearts,
        combo: 0,
        hits: n.hits + 1,
        scold: { text, line: e.v.line, col: e.v.col, ttl: BALANCE.inspectDur + 0.6 },
        overIn: hearts <= 0 && n.overIn === null ? BALANCE.inspectDur : n.overIn,
      };
    } else if (e.type === "line") {
      if (doc[e.line].trim() === "") continue;
      if (e.clean) {
        const combo = n.combo + 1;
        const mult = 1 + Math.floor(combo / BALANCE.score.comboStep);
        n = {
          ...n,
          combo,
          score: n.score + BALANCE.score.cleanLine * mult,
          stats: { ...n.stats, clean: n.stats.clean + 1 },
          marks: { ...n.marks, [e.line]: { clean: true, viol: [] } },
        };
      } else {
        n = {
          ...n,
          stats: { ...n.stats, bad: n.stats.bad + 1 },
          marks: { ...n.marks, [e.line]: { clean: false, viol: e.viol } },
        };
      }
    } else if (e.type === "done" && n.overIn === null) {
      const perfect = n.stats.bad === 0;
      const score = n.score + BALANCE.score.roundClear * n.round;
      n = {
        ...n,
        phase: "clear",
        perfect,
        score,
        best: Math.max(n.best, score),
        hearts: perfect ? Math.min(BALANCE.maxHearts, n.hearts + 1) : n.hearts,
      };
    }
  }

  // 냥이가 올라온 줄에 커서가 있으면 아래로 밀어낸다
  const min = minLineOf(n);
  if (n.cursor.line < min && min < n.doc.length) {
    n = { ...n, cursor: { line: min, col: firstCol(n.doc[min]) } };
  }
  return n;
}
