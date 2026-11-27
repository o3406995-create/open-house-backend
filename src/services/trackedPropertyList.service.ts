import { agentPropertyRepository } from "../repositories/agentProperty.repository.js"
import { trackedPropertyListRepository } from "../repositories/trackedPropertyList.repository.js"
import { propertyInterestRepository } from "../repositories/propertyInterest.repository.js"
import { AppError } from "../lib/AppError.js"
import { toTrackedItem, type UpcomingOpenHouseRow } from "../mappers/trackedPropertyMapper.js"
import { AGENT_ERROR_NO_PROFILE } from "../constants/agentProperty.js"

interface PageInput {
  page: number
  pageSize: number
}

export const trackedPropertyListService = {
  // The watchlist of an agent with the figures of each property. It is read from the database only: the
  // listings are the snapshots that were stored, so opening the page never costs a call to the data source.
  list: async (userId: number, { page, pageSize }: PageInput, now: Date = new Date()) => {
    // What an agent tracks hangs on the profile, so an account with none has nothing to list
    const agentId = await agentPropertyRepository.findAgentId(userId)
    if (agentId === null) {
      throw new AppError(AGENT_ERROR_NO_PROFILE, 409)
    }

    const { records, total } = await trackedPropertyListRepository.listForAgent(agentId, page, pageSize)
    const propertyIds = records.map((record) => record.property_id)

    // One query for each kind of figure, for the whole page, and not one for each property
    const [saveCounts, interestCounts, upcoming] = await Promise.all([
      propertyInterestRepository.saveCounts(propertyIds),
      propertyInterestRepository.interestCounts(propertyIds),
      propertyInterestRepository.upcomingOpenHouses(propertyIds, now),
    ])

    const openHousesOf = new Map<number, UpcomingOpenHouseRow[]>()
    for (const row of upcoming) {
      const list = openHousesOf.get(row.property_id) ?? []
      list.push(row)
      openHousesOf.set(row.property_id, list)
    }

    const trackedProperties = records.flatMap(
      (record) =>
        toTrackedItem(
          record,
          {
            saveCount: saveCounts.get(record.property_id) ?? 0,
            interestCount: interestCounts.get(record.property_id) ?? 0,
          },
          openHousesOf.get(record.property_id) ?? [],
        ) ?? [],
    )

    return { trackedProperties, total, page, pageSize }
  },
}
