import type { CatPhase } from "@/engine/cat";

export const CAT_W = 26;
export const CAT_H = 20;

/** 검정 실루엣 냥이. 걷기·점프·냥펀치는 다리/몸 CSS 애니메이션, idle·sit은 식빵 */
export function CatSprite({ phase, facing = 1 }: { phase: CatPhase; facing?: 1 | -1 }) {
  const loaf = phase === "idle" || phase === "sit";
  return (
    <svg
      className={`cat cat-${phase}`}
      width={CAT_W}
      height={CAT_H}
      viewBox="0 0 26 20"
      style={{ transform: `scaleX(${facing})` }}
      aria-hidden
    >
      {loaf ? (
        <g className="cat-body">
          <path className="cat-tail" d="M5 17.5 C9 19.5, 15 19.5, 19 18" />
          <ellipse cx="12" cy="14.5" rx="8.5" ry="4.5" />
          <circle cx="18.5" cy="9.5" r="3.8" />
          <path d="M15.8 7.2 L16.4 3.6 L18.6 6.1 Z M18.9 5.9 L21 3.4 L21.4 7.2 Z" />
          <path className="cat-eye-closed" d="M18.6 9.6 q0.8 0.7 1.6 0" />
        </g>
      ) : (
        <g className="cat-body">
          <path className="cat-tail" d="M5.5 11 C2 10, 1.5 5, 4 3.2" />
          <g className="cat-legs-a">
            <path className="cat-leg" d="M17 13.5 L17.6 19" />
            <path className="cat-leg" d="M8 13.5 L7.4 19" />
          </g>
          <g className="cat-legs-b">
            <path className="cat-leg" d="M15.4 13.5 L14.8 19" />
            <path className="cat-leg" d="M9.6 13.5 L10.2 19" />
          </g>
          <ellipse cx="12" cy="11.5" rx="7.5" ry="4" />
          <circle cx="19.5" cy="7.5" r="3.8" />
          <path d="M16.8 5.2 L17.4 1.6 L19.6 4.1 Z M19.9 3.9 L22 1.4 L22.4 5.2 Z" />
          <circle className="cat-eye" cx="20.9" cy="7" r="0.8" />
        </g>
      )}
    </svg>
  );
}

export function Paw() {
  return (
    <svg className="paw" width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <ellipse cx="5" cy="6.9" rx="2.4" ry="2" />
      <circle cx="2" cy="4.2" r="1" />
      <circle cx="4" cy="2.5" r="1" />
      <circle cx="6" cy="2.5" r="1" />
      <circle cx="8" cy="4.2" r="1" />
    </svg>
  );
}
