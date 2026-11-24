"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { BALANCE } from "@/config/balance";
import { initialState, keysFor, reducer, type GameState } from "@/engine/game";
import { buildExample } from "@/engine/generate";
import { RULES, checkAll } from "@/engine/rules";
import type { KeyId, RuleId } from "@/engine/types";
import { Briefing } from "./Briefing";
import { CatSprite, Paw } from "./CatSprite";
import { Editor } from "./Editor";
import { KeyBar } from "./KeyBar";

const STORE = "tidy-your-code:v1";
const newSeed = () => (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;

const KEYMAP: Record<string, KeyId> = {
  Enter: "enter",
  Tab: "tab",
  Backspace: "backspace",
  " ": "space",
  ";": ";",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

export function Game() {
  const [s, dispatch] = useReducer(reducer, initialState);

  // 저장된 최고점·본 규칙 불러오기
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const v = JSON.parse(raw) as { best?: number; seen?: RuleId[] };
        dispatch({ type: "LOAD", best: v.best ?? 0, seen: v.seen ?? [] });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ best: s.best, seen: s.seen }));
    } catch {}
  }, [s.best, s.seen]);

  // 게임 루프
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (last) dispatch({ type: "TICK", dt: Math.min(0.1, (t - last) / 1000) });
      last = t;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 혼나면 진동 (안드로이드만)
  useEffect(() => {
    if (s.hits > 0) navigator.vibrate?.(80);
  }, [s.hits]);

  // 물리 키보드
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = KEYMAP[e.key];
      if (!k) return;
      e.preventDefault();
      dispatch({ type: "KEY", key: k });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const file = s.spec?.file ?? "welcome";
  const editing = s.phase === "playing" || s.phase === "countdown";
  const briefRule = s.phase === "briefing" && s.briefing ? s.briefing.queue[s.briefing.idx] : null;

  return (
    <main className="stage">
      <div className="window" data-rule={briefRule ?? undefined}>
        <div className="titlebar">
          <span className="dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="title label">{file} — tidy-your-code</span>
        </div>

        <div className="tabs">
          <span className="tab active">
            <TabIcon kind={s.phase === "briefing" ? "md" : s.phase === "title" ? "vs" : "ts"} />
            {s.phase === "briefing" ? "cat-rules.md" : s.phase === "title" ? "Welcome" : file}
            <span className="tab-x" aria-hidden>
              ×
            </span>
          </span>
        </div>

        {(editing || s.phase === "clear" || s.phase === "over") && s.spec && (
          <RulesBar rules={s.spec.rules} unit={s.spec.unit} />
        )}

        <div className="pane">
          {s.phase === "title" && <Welcome best={s.best} onStart={() => dispatch({ type: "START", seed: newSeed() })} />}

          {s.phase === "briefing" && s.briefing && s.spec && (
            <Briefing
              key={`${s.round}-${s.briefing.idx}`}
              b={s.briefing}
              unit={s.spec.unit}
              rejects={s.rejects}
              onTap={(line, col) => dispatch({ type: "TAP", line, col })}
              onNext={() => dispatch({ type: "BRIEF_NEXT" })}
            />
          )}

          {editing && s.spec && <MainEditor s={s} onTap={(line, col) => dispatch({ type: "TAP", line, col })} />}

          {s.phase === "clear" && <Clear s={s} onNext={() => dispatch({ type: "NEXT_ROUND", seed: newSeed() })} />}

          {s.phase === "over" && (
            <Over
              s={s}
              onRetry={() => dispatch({ type: "START", seed: newSeed() })}
              onHome={() => dispatch({ type: "TO_TITLE" })}
            />
          )}
        </div>

        <StatusBar s={s} />

        {(editing || s.phase === "briefing") && (
          <KeyBar
            keys={keysFor(s)}
            highlight={briefRule ? RULES[briefRule].keys : []}
            onKey={(key) => dispatch({ type: "KEY", key })}
          />
        )}
      </div>
    </main>
  );
}

function TabIcon({ kind }: { kind: "ts" | "md" | "vs" }) {
  const glyph = kind === "ts" ? "TS" : kind === "md" ? "M↓" : "❯";
  return (
    <span className={`tab-icon ${kind}`} aria-hidden>
      {glyph}
    </span>
  );
}

function MainEditor({ s, onTap }: { s: GameState; onTap: (line: number, col: number) => void }) {
  const bubble =
    s.phase === "countdown"
      ? { text: `${Math.ceil(s.countdown)}초 뒤에 읽으러 간다냥`, line: -1, col: 0 }
      : s.scold
        ? { text: s.scold.text, line: s.scold.line, col: s.scold.col }
        : null;
  return (
    <Editor
      doc={s.doc}
      cursor={s.cursor}
      cat={s.cat}
      catLine={s.cat.line}
      marks={s.marks}
      bubble={bubble}
      onTap={onTap}
      rejects={s.rejects}
      follow
    />
  );
}

function RulesBar({ rules, unit }: { rules: RuleId[]; unit: number }) {
  const [peek, setPeek] = useState<RuleId | null>(null);
  const ex = useMemo(() => (peek ? buildExample(peek, unit, "example") : null), [peek, unit]);
  const bad = useMemo(
    () => (peek && ex ? checkAll(ex.doc, [peek], { target: ex.target, unit }) : []),
    [peek, ex, unit],
  );
  return (
    <div className="rulesbar">
      <div className="rules-row">
        <span className="cap">냥이 규칙</span>
        {rules.map((id) => (
          <button
            key={id}
            data-rule={id}
            className={`chip ${peek === id ? "on" : ""}`}
            onClick={() => setPeek(peek === id ? null : id)}
          >
            {RULES[id].label(unit)}
          </button>
        ))}
      </div>
      {peek && ex && (
        <div className="rules-peek">
          <p className="peek-say">{RULES[peek].plain(unit)}</p>
          <div className="brief-examples">
            <Editor doc={ex.doc} highlights={bad} fit label="✗" labelTone="bad" />
            <Editor doc={ex.target} fit label="✓" labelTone="good" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBar({ s }: { s: GameState }) {
  const hearts = Array.from({ length: BALANCE.maxHearts }, (_, i) => (i < s.hearts ? "♥" : "♡")).join("");
  const inGame = s.phase !== "title";
  const mode = !inGame ? "nofolder" : s.phase === "over" || (s.phase === "playing" && s.scold) ? "debug" : "normal";
  return (
    <div className="statusbar label" data-mode={mode}>
      <span className="sb-remote" aria-hidden>
        <Paw />
      </span>
      {inGame ? (
        <>
          <span className="hearts" aria-label={`목숨 ${s.hearts}`}>
            {hearts}
          </span>
          <span>R{s.round}</span>
          {s.phase === "playing" || s.phase === "countdown" ? (
            <span>
              Ln {s.cursor.line + 1}, Col {s.cursor.col + 1}
            </span>
          ) : null}
          <span className="sb-right">
            {s.combo >= 2 && <span>x{s.combo}</span>}
            {s.spec && <span>Spaces: {s.spec.unit}</span>}
            <span>{s.score.toLocaleString()}</span>
          </span>
        </>
      ) : (
        <>
          <span>main</span>
          <span className="sb-right">
            <span>TypeScript</span>
            <span>UTF-8</span>
          </span>
        </>
      )}
    </div>
  );
}

function Welcome({ best, onStart }: { best: number; onStart: () => void }) {
  return (
    <div className="screen">
      <div className="hero-cat">
        <CatSprite phase="sit" />
      </div>
      <h1 className="title-code">
        <span className="t-fn">tidy</span>
        <span className="t-br0">(</span>
        <span className="t-ident">your</span>
        <span className="t-op">.</span>
        <span className="t-type">Code</span>
        <span className="t-br0">)</span>
      </h1>
      <p>
        냥이가 코드 위를 걸어오면서 한 줄씩 읽는다.
        <br />
        냥이가 밟기 전에, 냥이 규칙대로 코드를 정리해라.
      </p>
      <p className="muted">탭해서 커서를 두고, 아래 키 몇 개로만 고친다. 코딩 몰라도 된다냥.</p>
      <button className="btn-primary" onClick={onStart}>
        시작하기
      </button>
      {best > 0 && <div className="label">BEST {best.toLocaleString()}</div>}
    </div>
  );
}

function Clear({ s, onNext }: { s: GameState; onNext: () => void }) {
  return (
    <div className="screen">
      <div className="label pass">✓ ROUND {s.round} CLEAR</div>
      <h2>{s.perfect ? "깔끔하다냥" : "이번엔 봐준다냥"}</h2>
      <dl className="rows">
        <div>
          <dt>통과한 줄</dt>
          <dd>{s.stats.clean}</dd>
        </div>
        <div>
          <dt>혼난 줄</dt>
          <dd>{s.stats.bad}</dd>
        </div>
        <div>
          <dt>점수</dt>
          <dd>{s.score.toLocaleString()}</dd>
        </div>
        {s.perfect && (
          <div>
            <dt>퍼펙트</dt>
            <dd>♥ +1</dd>
          </div>
        )}
      </dl>
      <button className="btn-primary" onClick={onNext}>
        다음 라운드
      </button>
    </div>
  );
}

function Over({ s, onRetry, onHome }: { s: GameState; onRetry: () => void; onHome: () => void }) {
  return (
    <div className="screen">
      <CatSprite phase="sit" />
      <div className="label fail">✗ GAME OVER</div>
      <h2>냥이가 삐졌다</h2>
      <dl className="rows">
        <div>
          <dt>라운드</dt>
          <dd>{s.round}</dd>
        </div>
        <div>
          <dt>점수</dt>
          <dd>{s.score.toLocaleString()}</dd>
        </div>
        <div>
          <dt>최고점</dt>
          <dd>{s.best.toLocaleString()}</dd>
        </div>
      </dl>
      <button className="btn-primary" onClick={onRetry}>
        다시 하기
      </button>
      <button className="btn-text" onClick={onHome}>
        처음으로 →
      </button>
    </div>
  );
}
