"use client";

import { useMemo } from "react";
import type { Briefing as B } from "@/engine/game";
import { RULES, checkAll } from "@/engine/rules";
import { CatSprite } from "./CatSprite";
import { Editor } from "./Editor";
import { KeyGlyph } from "./KeyBar";

export function Briefing({
  b,
  unit,
  rejects,
  onTap,
  onNext,
}: {
  b: B;
  unit: number;
  rejects: number;
  onTap: (line: number, col: number) => void;
  onNext: () => void;
}) {
  const id = b.queue[b.idx];
  const rule = RULES[id];
  const bad = useMemo(
    () => checkAll(b.example.doc, [id], { target: b.example.target, unit }),
    [b.example, id, unit],
  );
  const ready = !b.needPractice || b.practice.solved;

  return (
    <div className="briefing">
      <div className="brief-head">
        <CatSprite phase="sit" />
        <div>
          <div className="cap">
            {b.changed ? "냥이 변덕" : "이번에 볼 규칙"}
            {b.queue.length > 1 && ` ${b.idx + 1}/${b.queue.length}`}
            {" · "}
            <span className="rule-name">{rule.label(unit)}</span>
          </div>
          <p className="brief-say">{rule.plain(unit)}</p>
        </div>
      </div>

      <div className="brief-examples">
        <Editor doc={b.example.doc} highlights={bad} fit label="✗ 혼나는 코드" labelTone="bad" />
        <Editor doc={b.example.target} fit label="✓ 통과" labelTone="good" />
      </div>

      <div className="brief-keys">
        <span className="cap">이 키를 쓰면 돼</span>
        {rule.keys.map((k) => (
          <KeyGlyph key={k} k={k} />
        ))}
      </div>

      {b.needPractice && (
        <div className="brief-practice">
          <Editor
            doc={b.practice.doc}
            cursor={b.practice.cursor}
            onTap={onTap}
            rejects={rejects}
            fit
            labelTone={b.practice.solved ? "good" : undefined}
            label={b.practice.solved ? "연습 — 통과 ✓" : "연습 — 고칠 곳을 탭하고 아래 키를 눌러봐"}
          />
        </div>
      )}

      <button className="btn-primary brief-go" disabled={!ready} onClick={onNext}>
        알겠다냥
      </button>
    </div>
  );
}
