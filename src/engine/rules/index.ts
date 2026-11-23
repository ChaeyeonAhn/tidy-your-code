import type { Doc, RuleId, Violation } from "../types";
import { braceStyle } from "./braceStyle";
import { indent } from "./indent";
import { lineBreak } from "./lineBreak";
import { semicolon } from "./semicolon";
import { spaceInfix } from "./spaceInfix";
import type { RuleCtx, RuleDef } from "./types";

export const RULES: Record<RuleId, RuleDef> = { lineBreak, braceStyle, indent, spaceInfix, semicolon };

/** 위반을 만드는 순서. 줄을 합치는 규칙 → 줄 안을 바꾸는 규칙 → 들여쓰기 */
export const INJECT_ORDER: RuleId[] = ["braceStyle", "lineBreak", "spaceInfix", "semicolon", "indent"];

export function checkAll(doc: Doc, rules: RuleId[], ctx: RuleCtx): Violation[] {
  return rules.flatMap((id) => RULES[id].check(doc, ctx)).sort((a, b) => a.line - b.line || a.col - b.col);
}

export function checkLine(doc: Doc, line: number, rules: RuleId[], ctx: RuleCtx): Violation[] {
  return checkAll(doc, rules, ctx).filter((v) => v.line === line);
}

export function ruleChars(rules: RuleId[]): string {
  return rules.map((id) => RULES[id].chars).join("");
}

export type { RuleCtx, RuleDef };
