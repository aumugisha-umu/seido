import { describe, it, expect, vi, beforeEach } from "vitest"

const mockLoggerInfo = vi.fn()
vi.mock("@/lib/logger", () => ({
  logger: {
    info: mockLoggerInfo,
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logError: vi.fn(),
}))

// Set all required env vars before module import
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key-1234567890"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key-1234567890"

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: vi.fn() }))
}))

vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }))

describe("createServiceRoleSupabaseClient logging", () => {
  beforeEach(() => { mockLoggerInfo.mockClear() })

  it("should log keyPresent: true instead of key fragments", async () => {
    const { createServiceRoleSupabaseClient } = await import("@/lib/services/core/supabase-client")
    createServiceRoleSupabaseClient()
    const calls = mockLoggerInfo.mock.calls.filter(([msg]) => typeof msg === "string" && msg.includes("SERVICE-ROLE"))
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[0][1]).toHaveProperty("keyPresent", true)
  })

  it("should NOT log keyPrefix, keySuffix, or keyLength", async () => {
    const { createServiceRoleSupabaseClient } = await import("@/lib/services/core/supabase-client")
    createServiceRoleSupabaseClient()
    const allData = mockLoggerInfo.mock.calls.map(([, d]) => d).filter(Boolean)
    for (const d of allData) {
      expect(d).not.toHaveProperty("keyPrefix")
      expect(d).not.toHaveProperty("keySuffix")
      expect(d).not.toHaveProperty("keyLength")
    }
  })
})
