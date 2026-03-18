import { describe, it, expect, vi } from "vitest"

// Mock server-side logger dependency before importing error-handler
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logError: vi.fn(),
}))

import {
  validateRequired,
  validateEmail,
  validateUUID,
  ValidationException
} from "@/lib/services/core/error-handler"

describe("validateRequired (from error-handler)", () => {
  it("throws ValidationException for empty field", () => {
    expect(() => validateRequired({ name: "" }, ["name"])).toThrow(ValidationException)
  })
  it("throws ValidationException for null field", () => {
    expect(() => validateRequired({ name: null as any }, ["name"])).toThrow(ValidationException)
  })
  it("passes when all required fields are present", () => {
    expect(() => validateRequired({ name: "Alice", email: "test@test.com" }, ["name", "email"])).not.toThrow()
  })
})

describe("validateEmail (from error-handler)", () => {
  it("accepts valid email", () => {
    expect(() => validateEmail("test@example.com")).not.toThrow()
  })
  it("throws ValidationException for invalid email", () => {
    expect(() => validateEmail("notanemail")).toThrow(ValidationException)
  })
})

describe("validateUUID (from error-handler)", () => {
  it("accepts a valid v4 UUID", () => {
    expect(() => validateUUID("550e8400-e29b-41d4-a716-446655440000")).not.toThrow()
  })
  it("throws ValidationException for invalid UUID", () => {
    expect(() => validateUUID("not-a-uuid")).toThrow(ValidationException)
  })
})

describe("service-types no longer exports duplicate validators", () => {
  it("service-types does not export validateRequired", async () => {
    const st = await import("@/lib/services/core/service-types")
    expect((st as any).validateRequired).toBeUndefined()
  })
  it("service-types does not export validateEmail", async () => {
    const st = await import("@/lib/services/core/service-types")
    expect((st as any).validateEmail).toBeUndefined()
  })
  it("service-types does not export validateUUID", async () => {
    const st = await import("@/lib/services/core/service-types")
    expect((st as any).validateUUID).toBeUndefined()
  })
})
