import { describe, it, expect } from "vitest";
import { getLevel } from "@/components/RelevanceDots";

describe("getLevel", () => {
  it("returns 1 (low) for scores 1–4", () => {
    expect(getLevel(1)).toBe(1);
    expect(getLevel(4)).toBe(1);
  });

  it("returns 2 (medium) for scores 5–7", () => {
    expect(getLevel(5)).toBe(2);
    expect(getLevel(7)).toBe(2);
  });

  it("returns 3 (critical) for scores 8–10", () => {
    expect(getLevel(8)).toBe(3);
    expect(getLevel(10)).toBe(3);
  });

  it("boundary: score 8 is critical, score 7 is medium", () => {
    expect(getLevel(8)).toBe(3);
    expect(getLevel(7)).toBe(2);
  });

  it("boundary: score 5 is medium, score 4 is low", () => {
    expect(getLevel(5)).toBe(2);
    expect(getLevel(4)).toBe(1);
  });
});
