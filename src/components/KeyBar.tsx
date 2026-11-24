import type { KeyId } from "@/engine/types";

const INFO: Record<KeyId, { glyph: string; label: string }> = {
  left: { glyph: "◀", label: "LEFT" },
  right: { glyph: "▶", label: "RIGHT" },
  up: { glyph: "▲", label: "UP" },
  down: { glyph: "▼", label: "DOWN" },
  enter: { glyph: "⏎", label: "ENTER" },
  tab: { glyph: "⇥", label: "TAB" },
  backspace: { glyph: "⌫", label: "DEL" },
  space: { glyph: "␣", label: "SPACE" },
  ";": { glyph: ";", label: "SEMI" },
};

export function KeyGlyph({ k }: { k: KeyId }) {
  return <span className="keyglyph" data-k={k}>{INFO[k].glyph}</span>;
}

export function KeyBar({
  keys,
  highlight = [],
  disabled,
  onKey,
}: {
  keys: KeyId[];
  highlight?: KeyId[];
  disabled?: boolean;
  onKey: (k: KeyId) => void;
}) {
  return (
    <div className="keybar" style={{ gridTemplateColumns: `repeat(${keys.length}, 1fr)` }}>
      {keys.map((k) => (
        <button
          key={k}
          className={`key ${highlight.includes(k) ? "hl" : ""}`}
          data-k={k}
          disabled={disabled}
          aria-label={INFO[k].label}
          onPointerDown={(e) => {
            e.preventDefault();
            if (!disabled) onKey(k);
          }}
        >
          <span className="key-glyph">{INFO[k].glyph}</span>
          <span className="key-label">{INFO[k].label}</span>
        </button>
      ))}
    </div>
  );
}
