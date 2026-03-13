import { describe, it, expect } from "vitest"
import { sanitizeSearch } from "@/lib/utils/sanitize-search"

describe("sanitizeSearch", () => {
  it("passes through normal text unchanged", () => {
    expect(sanitizeSearch("normal text")).toBe("normal text")
  })
  it("removes PostgREST injection characters", () => {
    expect(sanitizeSearch("test,id.neq.0")).toBe("testidneq0")
  })
  it("trims whitespace", () => {
    expect(sanitizeSearch("  spaces  ")).toBe("spaces")
  })
  it("returns empty string for empty input", () => {
    expect(sanitizeSearch("")).toBe("")
  })
  it("preserves accented characters", () => {
    expect(sanitizeSearch("cafe")).toBe("cafe")
  })
  it("removes percent signs", () => {
    expect(sanitizeSearch("100%")).toBe("100")
  })
  it("removes parentheses", () => {
    expect(sanitizeSearch("test(value)")).toBe("testvalue")
  })
})
