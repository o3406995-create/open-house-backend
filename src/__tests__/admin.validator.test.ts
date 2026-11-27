import { describe, it, expect } from "@jest/globals"
import { createAgentSchema, listAgenciesSchema } from "../validators/admin.validator.js"
import { ADMIN_ERROR_AGENCY_CHOICE } from "../constants/admin.js"

const AGENCY = { name: "Riverside Realty", suburb: "Brisbane City", state: "QLD", postcode: "4000" }
const BASE = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  password: "long-enough-password",
  licenseNumber: "L-1234",
}
const withAgencyId = { ...BASE, agencyId: 3 }
const withAgency = { ...BASE, agency: AGENCY }

describe("createAgentSchema", () => {
  it("accepts an agency that exists, given by its id", () => {
    expect(createAgentSchema.parse(withAgencyId).agencyId).toBe(3)
  })

  it("accepts a new agency", () => {
    expect(createAgentSchema.parse(withAgency).agency).toEqual(AGENCY)
  })

  it("takes the space off the ends of the text, and leaves the inside alone", () => {
    const parsed = createAgentSchema.parse({
      ...withAgency,
      name: "  Alex Morgan  ",
      licenseNumber: " L-1234 ",
      agency: { ...AGENCY, name: "  Riverside  Realty " },
    })

    expect(parsed.name).toBe("Alex Morgan")
    expect(parsed.licenseNumber).toBe("L-1234")
    expect(parsed.agency?.name).toBe("Riverside  Realty")
  })

  it("writes the state in capitals", () => {
    expect(createAgentSchema.parse({ ...withAgency, agency: { ...AGENCY, state: "qld" } }).agency?.state).toBe("QLD")
  })

  it("accepts the details that a new agency may have", () => {
    const agency = {
      ...AGENCY,
      address: "12 Example Street",
      phone: "07 5550 0101",
      email: "hello@riverside.example.com",
      website: "https://riverside.example.com",
    }

    expect(createAgentSchema.parse({ ...BASE, agency }).agency).toEqual(agency)
  })

  it("drops fields it does not know, such as a role", () => {
    expect(createAgentSchema.parse({ ...withAgencyId, role: "ADMIN" })).not.toHaveProperty("role")
  })

  it("says what is wrong when no agency is given", () => {
    const result = createAgentSchema.safeParse(BASE)

    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.agencyId).toEqual([ADMIN_ERROR_AGENCY_CHOICE])
  })

  const choice: [string, unknown][] = [
    ["an agency by id and a new one together", { ...BASE, agencyId: 3, agency: AGENCY }],
    ["no agency at all", { ...BASE }],
  ]
  it.each(choice)("rejects %s", (_label, body) => {
    expect(createAgentSchema.safeParse(body).success).toBe(false)
  })

  const agencyIds: [string, unknown][] = [
    ["zero", 0],
    ["a negative id", -1],
    ["a decimal id", 1.5],
    ["an id as text", "3"],
    ["an id above the range of the column", 2147483648],
    ["null", null],
  ]
  it.each(agencyIds)("rejects %s as the agency id", (_label, agencyId) => {
    expect(createAgentSchema.safeParse({ ...BASE, agencyId }).success).toBe(false)
  })

  const account: [string, unknown][] = [
    ["no licence number", { ...withAgencyId, licenseNumber: undefined }],
    ["a blank licence number", { ...withAgencyId, licenseNumber: "   " }],
    ["a licence number that is too long", { ...withAgencyId, licenseNumber: "L".repeat(51) }],
    ["a blank name", { ...withAgencyId, name: "  " }],
    ["a name that is too long", { ...withAgencyId, name: "A".repeat(101) }],
    ["an e-mail address that is not one", { ...withAgencyId, email: "nope" }],
    ["a password that is too short", { ...withAgencyId, password: "short" }],
  ]
  it.each(account)("rejects %s", (_label, body) => {
    expect(createAgentSchema.safeParse(body).success).toBe(false)
  })

  const agencies: [string, unknown][] = [
    ["a new agency without a name", { ...AGENCY, name: undefined }],
    ["a new agency with a blank name", { ...AGENCY, name: "  " }],
    ["a new agency without a suburb", { ...AGENCY, suburb: undefined }],
    ["a new agency without a postcode", { ...AGENCY, postcode: undefined }],
    ["a postcode of three digits", { ...AGENCY, postcode: "400" }],
    ["a postcode of five digits", { ...AGENCY, postcode: "40000" }],
    ["a postcode that is not digits", { ...AGENCY, postcode: "abcd" }],
    ["a state that is not one of Australia", { ...AGENCY, state: "XX" }],
    ["an empty state", { ...AGENCY, state: "" }],
    ["a website that is not https", { ...AGENCY, website: "http://riverside.example.com" }],
    ["a website that runs a script", { ...AGENCY, website: "javascript:alert(1)" }],
    ["a website with another protocol", { ...AGENCY, website: "ftp://riverside.example.com" }],
    ["a website that is not a link", { ...AGENCY, website: "not a link" }],
    ["a phone number that is not one", { ...AGENCY, phone: "abc" }],
    ["an e-mail address of the agency that is not one", { ...AGENCY, email: "nope" }],
  ]
  it.each(agencies)("rejects %s", (_label, agency) => {
    expect(createAgentSchema.safeParse({ ...BASE, agency }).success).toBe(false)
  })
})

describe("listAgenciesSchema", () => {
  it("uses the defaults when nothing is given", () => {
    expect(listAgenciesSchema.parse({})).toEqual({ page: 1, pageSize: 20 })
  })

  it("trims the search text and turns the numbers from text", () => {
    expect(listAgenciesSchema.parse({ q: "  river ", page: "2", pageSize: "10" })).toEqual({
      q: "river",
      page: 2,
      pageSize: 10,
    })
  })

  const bad: [string, unknown][] = [
    ["an empty search", { q: "" }],
    ["a search that is too long", { q: "r".repeat(101) }],
    ["page 0", { page: "0" }],
    ["a page that is not a number", { page: "abc" }],
    ["page size 0", { pageSize: "0" }],
    ["a page size above the limit", { pageSize: "51" }],
  ]
  it.each(bad)("rejects %s", (_label, query) => {
    expect(listAgenciesSchema.safeParse(query).success).toBe(false)
  })
})
