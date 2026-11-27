import { describe, it, expect } from "@jest/globals"
import { findSameAgency, normalizeAgencyName } from "../helper/agency.js"

describe("normalizeAgencyName", () => {
  it.each([
    ["Riverside Realty", "riverside realty"],
    ["  Riverside   Realty  ", "riverside realty"],
    ["RIVERSIDE\tREALTY", "riverside realty"],
    ["Riverside\nRealty", "riverside realty"],
  ])("turns %j into %j", (name, expected) => {
    expect(normalizeAgencyName(name)).toBe(expected)
  })
})

describe("findSameAgency", () => {
  const agency = (agency_id: number, name: string) => ({ agency_id, name })

  it("finds the agency whatever the capitals and the spacing", () => {
    const found = findSameAgency([agency(1, "Other Realty"), agency(2, "Riverside Realty")], "  RIVERSIDE   realty ")

    expect(found).toEqual({ agency_id: 2, name: "Riverside Realty" })
  })

  it("takes the one that was made first when several have the same name", () => {
    const found = findSameAgency([agency(9, "X Realty"), agency(4, "x realty")], "X REALTY")

    expect(found?.agency_id).toBe(4)
  })

  it("answers null when no agency has that name", () => {
    expect(findSameAgency([agency(1, "Other Realty")], "Riverside Realty")).toBeNull()
  })

  it("answers null for no agencies at all", () => {
    expect(findSameAgency([], "Riverside Realty")).toBeNull()
  })

  it("does not take an agency whose name only contains the one that is asked for", () => {
    expect(findSameAgency([agency(1, "Riverside Realty Group")], "Riverside Realty")).toBeNull()
  })
})
