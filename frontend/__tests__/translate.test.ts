import { describe, it, expect, beforeEach, vi } from "vitest";
import { translateText, translateLongText } from "@/lib/translate";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("translateText", () => {
  beforeEach(() => localStorageMock.clear());

  it("returns original text when locale is 'it'", async () => {
    const result = await translateText("testo di prova", "it");
    expect(result).toBe("testo di prova");
  });

  it("returns empty string unchanged", async () => {
    const result = await translateText("", "en");
    expect(result).toBe("");
  });

  it("returns whitespace-only text unchanged", async () => {
    const result = await translateText("   ", "en");
    expect(result).toBe("   ");
  });

  it("returns cached value without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    // Pre-populate cache with the expected key
    // "testo di prova" = 14 chars, slug = "testo_di_prova"
    const key = "fox_tr_en_14_testo_di_prova";
    store[key] = "test text";

    const result = await translateText("testo di prova", "en");
    expect(result).toBe("test text");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("falls back to original text on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network error"));
    const result = await translateText("fallback test", "en");
    expect(result).toBe("fallback test");
  });
});

describe("translateLongText", () => {
  beforeEach(() => localStorageMock.clear());

  it("returns text unchanged when locale is 'it'", async () => {
    const text = "paragrafo uno\n\nparagrafo due";
    const result = await translateLongText(text, "it");
    expect(result).toBe(text);
  });

  it("splits into chunks and rejoins with double newline", async () => {
    // Mock fetch to return a predictable translation
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [[["translated chunk", "original"]]] as unknown,
    } as Response);

    const longText = Array(5).fill("short paragraph").join("\n\n");
    const result = await translateLongText(longText, "en");
    // Should contain double newlines between chunks
    expect(result).toContain("translated chunk");
    vi.restoreAllMocks();
  });
});
