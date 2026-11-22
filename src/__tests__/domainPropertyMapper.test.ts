import { describe, it, expect } from "@jest/globals"
import { mapInspectionTimes } from "../mappers/domainPropertyMapper.js"
import { addMyOpenHouseSchema } from "../validators/myOpenHouse.validator.js"

type Inspections = Parameters<typeof mapInspectionTimes>[1]

const LISTING_ID = "2018123456"

// The Saturday and the Sunday of the same weekend
const saturday = { openingTime: "2026-11-28T00:00:00.000Z", closingTime: "2026-11-28T00:30:00.000Z" }
const sunday = { openingTime: "2026-11-29T00:00:00.000Z", closingTime: "2026-11-29T00:30:00.000Z" }

const SATURDAY_ID = `${LISTING_ID}-1795824000`
const SUNDAY_ID = `${LISTING_ID}-1795910400`

const map = (times: object[]) => mapInspectionTimes(LISTING_ID, times as Inspections)
const ids = (list: { externalId: string }[]) => list.map((item) => item.externalId)

describe("mapInspectionTimes", () => {
  it("maps the opening and closing time and marks the inspection as scheduled", () => {
    expect(map([saturday])).toEqual([
      {
        externalId: SATURDAY_ID,
        startDatetime: new Date(saturday.openingTime),
        endDatetime: new Date(saturday.closingTime),
        status: "SCHEDULED",
      },
    ])
  })

  it("builds the id from the listing id and the opening time in seconds", () => {
    expect(ids(map([saturday, sunday]))).toEqual([SATURDAY_ID, SUNDAY_ID])
  })

  it("keeps the id of an inspection when an earlier one has passed and left the list", () => {
    const beforeSaturdayEnded = map([saturday, sunday])
    const afterSaturdayEnded = map([sunday])

    expect(ids(afterSaturdayEnded)).toEqual([SUNDAY_ID])
    expect(ids(afterSaturdayEnded)[0]).toBe(ids(beforeSaturdayEnded)[1])
  })

  it("gives an inspection the same id wherever it is in the list", () => {
    const idOfSunday = (times: object[]) =>
      map(times).find((item) => item.startDatetime.getTime() === Date.parse(sunday.openingTime))
        ?.externalId

    expect(idOfSunday([sunday, saturday])).toBe(SUNDAY_ID)
    expect(idOfSunday([saturday, sunday])).toBe(SUNDAY_ID)
    expect(idOfSunday([sunday])).toBe(SUNDAY_ID)
  })

  it("builds ids that the add endpoint accepts", () => {
    for (const openHouseExternalId of ids(map([saturday, sunday]))) {
      expect(
        addMyOpenHouseSchema.safeParse({ propertyExternalId: LISTING_ID, openHouseExternalId })
          .success,
      ).toBe(true)
    }
  })

  it("returns an empty list when there are no inspections", () => {
    expect(map([])).toEqual([])
  })
})
