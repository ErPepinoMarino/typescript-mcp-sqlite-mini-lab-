import { describe, it, expect } from "vitest";
import { isValidIdentifier } from "../src/db/validate.js";

describe("isValidIdentifier", () => {
  it("acepta identificadores válidos", () => {
    expect(isValidIdentifier("users")).toBe(true);
    expect(isValidIdentifier("_tmp")).toBe(true);
    expect(isValidIdentifier("t1")).toBe(true);
    expect(isValidIdentifier("MiTabla_2")).toBe(true);
  });

  it("rechaza identificadores peligrosos o vacíos", () => {
    expect(isValidIdentifier("users; drop")).toBe(false);
    expect(isValidIdentifier("")).toBe(false);
    expect(isValidIdentifier("1users")).toBe(false);
    expect(isValidIdentifier("a-b")).toBe(false);
    expect(isValidIdentifier("my table")).toBe(false);
    expect(isValidIdentifier("users,products")).toBe(false);
  });
});
