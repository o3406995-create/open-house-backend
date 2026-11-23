import { myOpenHouseRepository } from "../repositories/myOpenHouse.repository.js"
import { propertyService } from "./property.service.js"
import { AppError } from "../lib/AppError.js"
import { toPropertyRecord } from "../mappers/propertyRecordMapper.js"
import { toOpenHouseRecord } from "../mappers/openHouseRecordMapper.js"
import { groupOf, toMyOpenHouseItem, type MyOpenHouseItem } from "../mappers/myOpenHouseMapper.js"
import { toSummary } from "../helper/propertySummary.js"
import { retryOnConflict } from "../helper/retryOnConflict.js"
import { startOfNextDay } from "../helper/timeZone.js"
import {
  MY_OPEN_HOUSE_MAX_ATTEMPTS,
  MY_OPEN_HOUSE_ERROR_ENTRY_NOT_FOUND,
  MY_OPEN_HOUSE_ERROR_NOT_FOUND,
  MY_OPEN_HOUSE_ERROR_NOT_AVAILABLE,
  MY_OPEN_HOUSE_ERROR_NOT_STARTED,
  MY_OPEN_HOUSE_GROUP,
  OPEN_HOUSE_STATUS_SCHEDULED,
  USER_OPEN_HOUSE_STATUS_ATTENDED,
  type MyOpenHouseGroup,
} from "../constants/myOpenHouse.js"

export const myOpenHouseService = {
  add: async (
    userId: number,
    propertyExternalId: string,
    openHouseExternalId: string,
    now: Date = new Date(),
  ) => {
    // The listing and its open houses always come from the provider, never from the client.
    // Fetched before the transaction so a slow external call never holds a database
    // transaction open. Throws 404 when the property does not exist.
    const detail = await propertyService.getById(propertyExternalId)

    // The open house id is only meaningful together with its property
    const openHouse = detail.openHouses.find((item) => item.externalId === openHouseExternalId)
    if (!openHouse) {
      throw new AppError(MY_OPEN_HOUSE_ERROR_NOT_FOUND, 404)
    }

    // Nobody can attend an open house that was cancelled or is over
    if (
      openHouse.status !== OPEN_HOUSE_STATUS_SCHEDULED ||
      openHouse.endDatetime.getTime() <= now.getTime()
    ) {
      throw new AppError(MY_OPEN_HOUSE_ERROR_NOT_AVAILABLE, 409)
    }

    const { created, userOpenHouse } = await retryOnConflict(
      () =>
        myOpenHouseRepository.addForUser(
          userId,
          toPropertyRecord(detail),
          toOpenHouseRecord(openHouse),
        ),
      MY_OPEN_HOUSE_MAX_ATTEMPTS,
    )

    return {
      created,
      myOpenHouse: {
        myOpenHouseId: userOpenHouse.user_openHouse_id,
        addedAt: userOpenHouse.created_at,
        status: userOpenHouse.status,
        openHouse,
        property: toSummary(detail),
      },
    }
  },

  // The user's open houses in four groups. "Today" is the calendar day in the given time
  // zone. The stored snapshots are used as they are: nothing is asked of the data source.
  list: async (userId: number, timeZone: string, now: Date = new Date()) => {
    const rows = await myOpenHouseRepository.listForUser(userId)
    const startOfTomorrow = startOfNextDay(now, timeZone)

    const groups: Record<MyOpenHouseGroup, MyOpenHouseItem[]> = {
      [MY_OPEN_HOUSE_GROUP.TODAY]: [],
      [MY_OPEN_HOUSE_GROUP.UPCOMING]: [],
      [MY_OPEN_HOUSE_GROUP.ATTENDED]: [],
      [MY_OPEN_HOUSE_GROUP.EXPIRED]: [],
    }

    for (const row of rows) {
      const group = groupOf(row, now, startOfTomorrow)
      const item = toMyOpenHouseItem(row, group)
      if (item) {
        groups[group].push(item)
      }
    }

    // The rows come earliest first, which suits today and upcoming. What is already done is
    // read most recent first.
    groups.attended.reverse()
    groups.expired.reverse()

    return {
      timeZone,
      counts: {
        today: groups.today.length,
        upcoming: groups.upcoming.length,
        attended: groups.attended.length,
        expired: groups.expired.length,
      },
      myOpenHouses: groups,
    }
  },

  remove: async (userId: number, myOpenHouseId: number) => {
    const deleted = await myOpenHouseRepository.deleteForUser(userId, myOpenHouseId)

    // "Does not exist" and "belongs to someone else" look the same on purpose, so ids of
    // other users cannot be probed.
    if (deleted === 0) {
      throw new AppError(MY_OPEN_HOUSE_ERROR_ENTRY_NOT_FOUND, 404)
    }
  },

  // The user confirms that they went to an open house. Allowed once it has started (also after
  // it has finished). Marking an entry that is already attended is not an error.
  markAttended: async (userId: number, myOpenHouseId: number, now: Date = new Date()) => {
    const row = await myOpenHouseRepository.findForUser(userId, myOpenHouseId)

    // "Does not exist" and "belongs to someone else" look the same on purpose, so ids of
    // other users cannot be probed.
    if (!row) {
      throw new AppError(MY_OPEN_HOUSE_ERROR_ENTRY_NOT_FOUND, 404)
    }

    // The entry as it will be after this call. One that cannot be matched to an external open
    // house is not listed either, so it is not touched.
    const item = toMyOpenHouseItem(
      { ...row, status: USER_OPEN_HOUSE_STATUS_ATTENDED },
      MY_OPEN_HOUSE_GROUP.ATTENDED,
    )
    if (!item) {
      throw new AppError(MY_OPEN_HOUSE_ERROR_ENTRY_NOT_FOUND, 404)
    }

    if (row.status === USER_OPEN_HOUSE_STATUS_ATTENDED) {
      return item
    }

    // Nobody can have attended an open house that has not started
    if (row.openHouse.start_datetime.getTime() > now.getTime()) {
      throw new AppError(MY_OPEN_HOUSE_ERROR_NOT_STARTED, 409)
    }

    const updated = await myOpenHouseRepository.markAttended(userId, myOpenHouseId)

    // Nothing was updated: either the entry was removed in the meantime, or a concurrent
    // request (a double click) marked it first. Only the first is an error.
    if (updated === 0) {
      const again = await myOpenHouseRepository.findForUser(userId, myOpenHouseId)
      if (!again) {
        throw new AppError(MY_OPEN_HOUSE_ERROR_ENTRY_NOT_FOUND, 404)
      }
    }

    return item
  },
}
