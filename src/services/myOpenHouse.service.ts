import { myOpenHouseRepository } from "../repositories/myOpenHouse.repository.js"
import { propertyService } from "./property.service.js"
import { AppError } from "../lib/AppError.js"
import { toPropertyRecord } from "../mappers/propertyRecordMapper.js"
import { toOpenHouseRecord } from "../mappers/openHouseRecordMapper.js"
import { toSummary } from "../helper/propertySummary.js"
import { retryOnConflict } from "../helper/retryOnConflict.js"
import {
  MY_OPEN_HOUSE_MAX_ATTEMPTS,
  MY_OPEN_HOUSE_ERROR_NOT_FOUND,
  MY_OPEN_HOUSE_ERROR_NOT_AVAILABLE,
  OPEN_HOUSE_STATUS_SCHEDULED,
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
}
