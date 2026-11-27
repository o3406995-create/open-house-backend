import { agentPropertyRepository } from "../repositories/agentProperty.repository.js"
import { propertyService } from "./property.service.js"
import { AppError } from "../lib/AppError.js"
import { toPropertyRecord } from "../mappers/propertyRecordMapper.js"
import { toSummary } from "../helper/propertySummary.js"
import { retryOnConflict } from "../helper/retryOnConflict.js"
import { AGENT_ERROR_NO_PROFILE, TRACK_PROPERTY_MAX_ATTEMPTS } from "../constants/agentProperty.js"

export const agentPropertyService = {
  // Any property that a search can find may be tracked: nothing says it has to be the agent's own.
  track: async (userId: number, externalId: string) => {
    // Before the provider is asked: an account with no profile cannot track anything
    const agentId = await agentPropertyRepository.findAgentId(userId)
    if (agentId === null) {
      throw new AppError(AGENT_ERROR_NO_PROFILE, 409)
    }

    // The listing always comes from the provider, never from the client, and is fetched before
    // the transaction so a slow external call never holds one open. Throws 404 when it does not exist.
    const detail = await propertyService.getById(externalId)

    // Two requests that race: the loser gets a unique key error or an aborted transaction, and
    // running it again finds what the winner made
    const { created, tracked } = await retryOnConflict(
      () => agentPropertyRepository.trackForAgent(agentId, toPropertyRecord(detail)),
      TRACK_PROPERTY_MAX_ATTEMPTS,
    )

    return {
      created,
      trackedProperty: {
        trackedId: tracked.tracked_id,
        addedAt: tracked.created_at,
        property: toSummary(detail),
      },
    }
  },
}
