import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const userRepoFile = path.resolve(__dirname, "../../../lib/services/repositories/user.repository.ts")
const content = fs.readFileSync(userRepoFile, "utf8")

// Extract all validateEnum calls to check their enum arrays
const enumCalls = content.match(/validateEnum\([^)]+\)/g) || []

describe("UserRepository - French role enum values", () => {
  it("uses gestionnaire in validateEnum calls", () => {
    expect(content).toContain("gestionnaire")
  })
  it("uses locataire in validateEnum calls", () => {
    expect(content).toContain("locataire")
  })
  it("uses prestataire in validateEnum calls", () => {
    expect(content).toContain("prestataire")
  })
  it("uses proprietaire in validateEnum calls", () => {
    expect(content).toContain("proprietaire")
  })
  it("validateEnum calls do not use manager", () => {
    for (const call of enumCalls) {
      expect(call).not.toContain("'manager'")
    }
  })
  it("validateEnum calls do not use tenant", () => {
    for (const call of enumCalls) {
      expect(call).not.toContain("'tenant'")
    }
  })
  it("validateEnum calls do not use provider", () => {
    for (const call of enumCalls) {
      expect(call).not.toContain("'provider'")
    }
  })
})
