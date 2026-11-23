import { describe, expect, it } from "vitest";
import { SNIPPETS } from "@/content/snippets";
import { BALANCE } from "@/config/balance";
import { stepCat, startCat } from "../cat";
import { strip } from "../core";
import { applyKey, backspace, newline } from "../doc";
import { buildExample, buildRound, injectAll, render } from "../generate";
import { RULES, checkAll, checkLine, ruleChars } from "../rules";
import { mulberry32 } from "../rng";
import type { Doc, KeyId, RuleId } from "../types";

const ALL = Object.keys(RULES) as RuleId[];
const UNITS = [2, 4];

describe("정답은 깨끗하다", () => {
  for (const s of SNIPPETS)
    for (const unit of UNITS)
      it(`${s.file} @${unit}`, () => {
        const target = render(s.src, unit);
        expect(checkAll(target, ALL, { target, unit })).toEqual([]);
        for (const l of target) expect(l.length).toBeLessThanOrEqual(BALANCE.maxCols);
      });
});

describe("주입은 잡히고, 해결 가능하다", () => {
  for (const id of ALL)
    for (const s of SNIPPETS)
      for (const unit of UNITS)
        it(`${id} × ${s.file} @${unit}`, () => {
          const target = render(s.src, unit);
          for (let seed = 1; seed <= 20; seed++) {
            const doc = injectAll(target, [id], seed, 2, 1, unit);
            expect(checkAll(doc, [id], { target, unit }).length).toBeGreaterThan(0);
            expect(strip(doc)).toBe(strip(target));
            for (const l of doc) expect(l.length).toBeLessThanOrEqual(BALANCE.maxCols);
          }
        });
});

describe("라운드 생성", () => {
  it("1~30 라운드 모두 위반이 있고 코어가 같다", () => {
    let unit = 2;
    for (let r = 1; r <= 30; r++) {
      const spec = buildRound(r, r * 977, unit);
      unit = spec.unit;
      const ctx = { target: spec.target, unit: spec.unit };
      expect(checkAll(spec.target, spec.rules, ctx)).toEqual([]);
      expect(checkAll(spec.doc, spec.rules, ctx).length).toBeGreaterThan(0);
      expect(strip(spec.doc)).toBe(strip(spec.target));
      expect(checkAll(spec.doc, spec.rules, ctx).every((v) => v.line >= 1)).toBe(true);
    }
  });

  it("브리핑 예시·연습은 위반이 있다", () => {
    for (const id of ALL)
      for (const which of ["example", "practice"] as const) {
        const { target, doc } = buildExample(id, 2, which);
        expect(checkAll(target, [id], { target, unit: 2 })).toEqual([]);
        expect(checkAll(doc, [id], { target, unit: 2 }).length).toBeGreaterThan(0);
      }
  });
});

describe("편집: 코드는 부술 수 없다", () => {
  it("랜덤 키 입력 후에도 코어가 그대로다", () => {
    const keys: KeyId[] = ["left", "right", "up", "down", "enter", "tab", "backspace", "backspace", "space", ";"];
    for (const s of SNIPPETS) {
      const rng = mulberry32(42);
      let doc: Doc = render(s.src, 2);
      const core = strip(doc);
      let cur = { line: 0, col: 0 };
      for (let i = 0; i < 2000; i++) {
        const k = keys[Math.floor(rng() * keys.length)];
        const r = applyKey(doc, cur, k, { unit: 2, deletable: ";", minLine: 0 });
        if (r) {
          doc = r.doc;
          cur = r.cursor;
        }
      }
      expect(strip(doc)).toBe(core);
    }
  });

  it("엔터는 자동 들여쓰기 + 공백 정리", () => {
    const doc = ["function f() {", "  a(); b();", "}"];
    const r = newline(doc, { line: 1, col: 6 }, { unit: 2, deletable: "", minLine: 0 })!;
    expect(r.doc).toEqual(["function f() {", "  a();", "  b();", "}"]);
    expect(r.cursor).toEqual({ line: 2, col: 2 });
  });

  it("엔터로 접힌 블록을 펼 수 있다", () => {
    const ctx = { unit: 2, deletable: "", minLine: 0 };
    let doc = ["if (x) { y(); }"];
    doc = newline(doc, { line: 0, col: 8 }, ctx)!.doc;
    expect(doc).toEqual(["if (x) {", "  y(); }"]);
    doc = newline(doc, { line: 1, col: 7 }, ctx)!.doc;
    expect(doc).toEqual(["if (x) {", "  y();", "}"]);
    expect(checkAll(doc, ["braceStyle", "indent", "lineBreak"], { target: doc, unit: 2 })).toEqual([]);
  });

  it("⌫는 앞쪽 공백에서 탭 스톱까지 지운다", () => {
    const r = backspace(["   a();"], { line: 0, col: 3 }, { unit: 2, deletable: "", minLine: 0 })!;
    expect(r.doc).toEqual(["  a();"]);
  });

  it("잠긴 줄은 편집할 수 없다", () => {
    const ctx = { unit: 2, deletable: "", minLine: 1 };
    expect(newline(["a();", "b();"], { line: 0, col: 4 }, ctx)).toBeNull();
    expect(backspace(["a();", "b();"], { line: 1, col: 0 }, ctx)).toBeNull();
  });

  it("식별자 안에는 끼워 넣을 수 없다", () => {
    expect(applyKey(["meow();"], { line: 0, col: 2 }, "space", { unit: 2, deletable: "", minLine: 0 })).toBeNull();
  });
});

describe("냥이", () => {
  const rules: RuleId[] = ["semicolon", "spaceInfix"];
  const target = ["a = 1;", "b = 2;", "c = 3;"];
  const doc = ["a = 1;", "b=2", "c = 3;"];
  const ctx = { target, unit: 2 };
  const check = (l: number) => checkLine(doc, l, rules, ctx);

  it("위반 지점에서 멈추고 줄당 한 번만 냥펀치", () => {
    let cat = startCat(doc);
    const events = [];
    for (let i = 0; i < 400; i++) {
      const r = stepCat(cat, doc, 1 / 60, 8, check);
      cat = r.cat;
      events.push(...r.events);
      if (cat.phase === "inspect") {
        expect(cat.line).toBe(1);
        expect(cat.col).toBe(1);
        break;
      }
    }
    expect(events.filter((e) => e.type === "violation" && e.first)).toHaveLength(1);
  });

  it("큰 dt에도 위반을 건너뛰지 않는다", () => {
    const r = stepCat(startCat(doc), doc, 100, 8, check);
    const firsts = r.events.filter((e) => e.type === "violation" && e.first);
    const all = r.events.filter((e) => e.type === "violation");
    expect(firsts).toHaveLength(1);
    expect(all).toHaveLength(2);
    expect(r.events.at(-1)).toEqual({ type: "done" });
    expect(r.events.filter((e) => e.type === "line").map((e) => e.type === "line" && e.clean)).toEqual([true, false, true]);
  });

  it("빈 줄은 연속으로 점프해 지나간다", () => {
    const d = ["a();", "", "", "b();"];
    const r = stepCat(startCat(d), d, 100, 8, () => []);
    expect(r.events.filter((e) => e.type === "line")).toHaveLength(4);
    expect(r.cat.phase).toBe("sit");
  });
});

it("규칙 문자", () => {
  expect(ruleChars(["semicolon", "indent"])).toBe(";");
});
