export type Doc = string[];

export interface Cursor {
  line: number;
  col: number;
}

export type RuleId = "lineBreak" | "braceStyle" | "indent" | "spaceInfix" | "semicolon";

export interface Violation {
  line: number;
  col: number;
  ruleId: RuleId;
}

export type KeyId = "left" | "right" | "up" | "down" | "enter" | "tab" | "backspace" | "space" | ";";
