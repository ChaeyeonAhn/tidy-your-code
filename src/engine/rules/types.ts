import type { Rng } from "../rng";
import type { Doc, KeyId, RuleId, Violation } from "../types";

export interface RuleCtx {
  /** 이번 판의 정답 doc (규칙 문자 앵커 비교용) */
  target: Doc;
  /** 들여쓰기 한 단위 (2 | 4) */
  unit: number;
}

export interface InjectOpts {
  /** 이 줄부터만 망가뜨린다 (첫 줄은 냥이가 바로 밟으니까 기본 1) */
  minLine: number;
  /** 망가뜨린 줄이 이 길이를 넘으면 안 된다 (모바일 40자) */
  maxCols: number;
  unit: number;
}

export interface RuleDef {
  id: RuleId;
  /** RULES 바 칩 문구 */
  label: (unit: number) => string;
  /** 브리핑 말투 */
  plain: (unit: number) => string;
  /** 이 규칙을 고치는 데 쓰는 키 (브리핑에서 강조) */
  keys: KeyId[];
  /** ⌫로 지울 수 있게 되는 규칙 문자 */
  chars: string;
  check: (doc: Doc, ctx: RuleCtx) => Violation[];
  inject: (doc: Doc, rng: Rng, n: number, opts: InjectOpts) => Doc;
  /** 브리핑 ✗/✓ 예시 원본 (2칸 기준) */
  example: string;
  /** 브리핑 연습 원본 */
  practice: string;
  scolds: string[];
}

export const replaceLine = (doc: Doc, i: number, ...lines: string[]) => [
  ...doc.slice(0, i),
  ...lines,
  ...doc.slice(i + 1),
];
