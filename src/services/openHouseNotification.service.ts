import { openHouseNotificationRepository } from "../repositories/openHouseNotification.repository.js"
import { toOpenHouseRecord } from "../mappers/openHouseRecordMapper.js"
import { newOpenHouseMessage } from "../constants/openHouseNotification.js"
import { OPEN_HOUSE_STATUS_SCHEDULED } from "../constants/myOpenHouse.js"
import type { OpenHouseDTO } from "../types/property.js"

// A listing as the data source names it
export interface ListingKey {
  source: string
  externalId: string
}

// Only an open house that is still to come and was not cancelled is worth telling anyone about
function isUpcomingAndScheduled(item: OpenHouseDTO, now: Date): boolean {
  return item.status === OPEN_HOUSE_STATUS_SCHEDULED && item.endDatetime.getTime() > now.getTime()
}

export const openHouseNotificationService = {
  // Called with the open houses a data source just returned for a property. It stores the ones it
  // has not seen and tells the people who saved the property about the new ones.
  //
  // The first time a property is recorded is the baseline: what the data source lists then is
  // stored and nobody is told, or everyone who saved the property would be told about every
  // open house at once. After that, an open house counts as new when its id was never seen.
  // Whatever happens to an open house later (cancelled, moved) is not handled here: a moved open
  // house gets a new id with the Domain data source, so it counts as new.
  recordOpenHouses: async (listing: ListingKey, openHouses: OpenHouseDTO[], now: Date = new Date()) => {
    const known = await openHouseNotificationRepository.findSeen(listing.source, listing.externalId)

    // Nobody saved this property and nobody added one of its open houses: nobody to tell
    if (!known) {
      return { baseline: false, recorded: 0, notified: 0 }
    }

    const seen = new Set(known.openHouses.map((item) => item.external_id))
    const fresh = openHouses.filter((item) => !seen.has(item.externalId))
    const baseline = known.open_houses_seen_at === null

    if (fresh.length === 0 && !baseline) {
      return { baseline, recorded: 0, notified: 0 }
    }

    const toTell = baseline ? [] : fresh.filter((item) => isUpcomingAndScheduled(item, now))

    const { notified } = await openHouseNotificationRepository.recordAndNotify({
      propertyId: known.property_id,
      records: fresh.map(toOpenHouseRecord),
      notifyExternalIds: toTell.map((item) => item.externalId),
      message: newOpenHouseMessage(known.address),
      now,
    })

    console.info(
      "open house notifications",
      JSON.stringify({ propertyId: known.property_id, baseline, recorded: fresh.length, notified }),
    )

    return { baseline, recorded: fresh.length, notified }
  },
}
