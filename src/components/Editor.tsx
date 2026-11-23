"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { catPose, type Cat } from "@/engine/cat";
import type { LineMark } from "@/engine/game";
import { tokenizeLine, type Tok } from "@/engine/tokenize";
import type { Cursor, Doc, Violation } from "@/engine/types";
import { CAT_H, CAT_W, CatSprite, Paw } from "./CatSprite";

export const LH = 24;
const GUTTER = 40;
const PADX = 8;

type LineState = "normal" | "passed" | "bad" | "current";

const CONTROL = new Set(["if", "else", "for", "while", "return", "break", "continue", "of", "in"]);
const OPEN = new Set(["(", "{", "["]);
const CLOSE = new Set([")", "}", "]"]);

/** VSCode Dark+ 스타일 토큰 클래스 */
function classOf(toks: Tok[], k: number): string {
  const t = toks[k];
  if (t.type === "kw") return CONTROL.has(t.text) ? "t-control" : "t-kw";
  if (t.type === "ident") {
    if (toks[k + 1]?.text === "(") return "t-fn";
    if (/^[A-Z][A-Z0-9_]+$/.test(t.text)) return "t-const";
    if (/^[A-Z]/.test(t.text)) return "t-type";
  }
  return `t-${t.type}`;
}

/** 줄마다 시작 시점의 괄호 깊이 (괄호 쌍 색칠용) */
function bracketStarts(doc: Doc): number[] {
  let d = 0;
  return doc.map((line) => {
    const start = d;
    for (const t of tokenizeLine(line)) {
      if (t.type !== "punct") continue;
      if (OPEN.has(t.text)) d++;
      else if (CLOSE.has(t.text)) d = Math.max(0, d - 1);
    }
    return start;
  });
}

const CodeLine = memo(function CodeLine({
  text,
  n,
  state,
  br,
}: {
  text: string;
  n: number;
  state: LineState;
  br: number;
}) {
  const parts: ReactNode[] = [];
  let i = 0;
  let depth = br;
  const toks = tokenizeLine(text);
  toks.forEach((t, k) => {
    if (t.start > i) parts.push(text.slice(i, t.start));
    let cls = classOf(toks, k);
    if (t.type === "punct" && OPEN.has(t.text)) cls = `t-br${depth++ % 3}`;
    else if (t.type === "punct" && CLOSE.has(t.text)) cls = `t-br${(depth = Math.max(0, depth - 1)) % 3}`;
    parts.push(
      <span key={t.start} className={cls}>
        {t.text}
      </span>,
    );
    i = t.end;
  });
  if (i < text.length) parts.push(text.slice(i));
  return (
    <div className={`ln ln-${state}`}>
      <span className="gutter">{state === "passed" ? <Paw /> : n + 1}</span>
      <span className="txt">{parts}</span>
    </div>
  );
});

function useCharWidth(ref: React.RefObject<HTMLSpanElement | null>) {
  const [w, setW] = useState(7.8);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (el) setW(el.getBoundingClientRect().width / 20);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref]);
  return w;
}

interface Props {
  doc: Doc;
  cursor?: Cursor | null;
  /** 냥이가 서 있는 줄. 이 줄 위는 지나간 줄 */
  catLine?: number;
  cat?: Cat | null;
  marks?: Record<number, LineMark>;
  highlights?: Violation[];
  bubble?: { text: string; line: number; col: number } | null;
  onTap?: (line: number, col: number) => void;
  rejects?: number;
  /** 커서를 따라 스크롤 (메인 에디터) */
  follow?: boolean;
  /** 내용 높이에 맞춤 (브리핑 예시) */
  fit?: boolean;
  label?: string;
}

export function Editor({
  doc,
  cursor,
  catLine = -1,
  cat,
  marks = {},
  highlights = [],
  bubble,
  onTap,
  rejects = 0,
  follow,
  fit,
  label,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const charW = useCharWidth(measureRef);
  const [view, setView] = useState({ top: 0, h: 0 });
  const padTop = cat ? LH : 4;
  const brStarts = useMemo(() => bracketStarts(doc), [doc]);

  const xOf = (col: number) => GUTTER + PADX + col * charW;
  const yOf = (line: number) => padTop + line * LH;

  const cursorLine = cursor?.line;
  useEffect(() => {
    const el = scrollRef.current;
    if (!follow || cursorLine === undefined || !el) return;
    const top = padTop + cursorLine * LH;
    if (top < el.scrollTop + LH) el.scrollTo({ top: top - LH * 2, behavior: "smooth" });
    else if (top + LH * 2 > el.scrollTop + el.clientHeight)
      el.scrollTo({ top: top + LH * 3 - el.clientHeight, behavior: "smooth" });
  }, [cursorLine, follow, padTop]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || fit) return;
    const update = () => setView({ top: el.scrollTop, h: el.clientHeight });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [fit]);

  const onClick = (e: React.MouseEvent) => {
    if (!onTap || !codeRef.current) return;
    const r = codeRef.current.getBoundingClientRect();
    const x = e.clientX - r.left - GUTTER - PADX;
    const y = e.clientY - r.top - padTop;
    const line = Math.floor(y / LH);
    if (line < 0 || line >= doc.length) return;
    onTap(line, Math.max(0, Math.round(x / charW)));
  };

  const pose = cat ? catPose(cat) : null;
  const squiggles = [...highlights, ...Object.values(marks).flatMap((m) => m.viol)];

  const stateOf = (i: number): LineState => {
    const m = marks[i];
    if (m && !m.clean) return "bad";
    if (i < catLine) return m?.clean ? "passed" : "normal";
    if (i === catLine) return "current";
    return "normal";
  };

  const catTop = pose ? yOf(pose.line) : 0;
  const offscreen =
    pose && !fit && view.h > 0
      ? catTop + LH < view.top
        ? "up"
        : catTop > view.top + view.h
          ? "down"
          : null
      : null;

  return (
    <div className={`editor-wrap ${fit ? "fit" : ""}`}>
      {label && <div className="editor-label cap">{label}</div>}
      <div className="editor" ref={scrollRef} onClick={onClick} role={onTap ? "textbox" : undefined} aria-label={label}>
        <div className="code" ref={codeRef} style={{ paddingTop: padTop }}>
          <span className="measure" ref={measureRef} aria-hidden>
            {"M".repeat(20)}
          </span>
          {doc.map((text, i) => (
            <CodeLine key={i} text={text} n={i} state={stateOf(i)} br={brStarts[i]} />
          ))}

          {squiggles.map((v, i) => (
            <span
              key={`${v.line}:${v.col}:${i}`}
              className="squiggle"
              style={{ left: xOf(v.col) - charW * 0.5, top: yOf(v.line) + LH - 5, width: charW * 2 }}
            />
          ))}

          {cursor && (
            <span
              key={rejects}
              className={`caret ${rejects ? "shake" : ""}`}
              style={{ left: xOf(cursor.col) - 1, top: yOf(cursor.line) + 3, height: LH - 6 }}
            />
          )}

          {pose && cat && (
            <div
              className="cat-pos"
              style={{
                left: xOf(pose.col) - CAT_W / 2,
                top: yOf(pose.line) + LH - CAT_H - 2 - pose.lift * LH * 0.9,
              }}
            >
              <CatSprite phase={cat.phase} facing={pose.facing} />
            </div>
          )}

          {bubble && (
            <div
              className="bubble"
              style={{
                left: Math.max(GUTTER, xOf(bubble.col) - 32),
                top: bubble.line < 1 ? yOf(bubble.line) + LH + 2 : yOf(bubble.line) - LH - 10,
              }}
            >
              {bubble.text}
            </div>
          )}
        </div>
      </div>
      {offscreen && (
        <button
          className="cat-indicator cap"
          onClick={() => scrollRef.current?.scrollTo({ top: catTop - LH * 3, behavior: "smooth" })}
        >
          냥이 {offscreen === "up" ? "↑" : "↓"} {Math.abs(Math.round((catTop - view.top) / LH))}줄
        </button>
      )}
    </div>
  );
}
