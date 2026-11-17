import { savedPropertyRepository } from "../repositories/savedProperty.repository.js"
import { propertyService } from "./property.service.js"
import { toPropertyRecord, type PropertyRecordInput } from "../mappers/propertyRecordMapper.js"
import { toSummary } from "../helper/propertySummary.js"
import { isUniqueConstraintError } from "../helper/prismaErrors.js"
import { SAVE_PROPERTY_MAX_ATTEMPTS } from "../constants/savedProperty.js"

// The unique indexes are the final guard against duplicates. When two requests race and
// one loses (unique constraint error), running the transaction again finds the rows the
// winner committed, so the loser ends up as a normal "already saved" result.
async function saveWithRetry(userId: number, record: PropertyRecordInput) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await savedPropertyRepository.saveForUser(userId, record)
    } catch (err) {
      if (!isUniqueConstraintError(err) || attempt >= SAVE_PROPERTY_MAX_ATTEMPTS) {
        throw err
      }
    }
  }
}

export const savedPropertyService = {
  save: async (userId: number, externalId: string) => {
    // The listing always comes from the provider, never from the client. Fetched before
    // the transaction so a slow external call never holds a database transaction open.
    // Throws 404 when the property does not exist.
    const detail = await propertyService.getById(externalId)

    const { created, savedProperty } = await saveWithRetry(userId, toPropertyRecord(detail))

    return {
      created,
      savedProperty: {
        savedPropertyId: savedProperty.saved_property_id,
        savedAt: savedProperty.saved_at,
        property: toSummary(detail),
      },
    }
  },
}