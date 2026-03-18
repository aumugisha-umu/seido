import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const statsFile = path.resolve(__dirname, "../../../lib/services/repositories/stats.repository.ts")
const statsContent = fs.readFileSync(statsFile, "utf8")

describe("StatsRepository - no nonexistent columns", () => {
  it("does not reference assigned_gestionnaire column", () => {
    expect(statsContent).not.toContain("assigned_gestionnaire")
  })
  it("does not reference assigned_prestataire column", () => {
    expect(statsContent).not.toContain("assigned_prestataire")
  })
  it("uses intervention_assignments table for assignment counts", () => {
    expect(statsContent).toContain("intervention_assignments")
  })
})
