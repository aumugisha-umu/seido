import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const lotFile = path.resolve(__dirname, "../../../lib/services/repositories/lot.repository.ts")
const content = fs.readFileSync(lotFile, "utf8")

describe("LotRepository.findOccupied - correct role filter", () => {
  it("uses locataire role filter, not tenant", () => {
    expect(content).toContain("'lot_contacts.user.role', 'locataire'")
  })
  it("does not use the wrong tenant role filter", () => {
    expect(content).not.toContain("'lot_contacts.user.role', 'tenant'")
  })
})
