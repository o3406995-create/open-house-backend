import { agentPropertyRepository } from "../repositories/agentProperty.repository.js"
import { trackedPropertyRemoveRepository } from "../repositories/trackedPropertyRemove.repository.js"
import { AppError } from "../lib/AppError.js"
import { AGENT_ERROR_NO_PROFILE, AGENT_ERROR_TRACKED_NOT_FOUND } from "../constants/agentProperty.js"

export const trackedPropertyRemoveService = {
  remove: async (userId: number, trackedId: number) => {
    // What an agent tracks hangs on the profile, so an account with none has nothing to remove
    const agentId = await agentPropertyRepository.findAgentId(userId)
    if (agentId === null) {
      throw new AppError(AGENT_ERROR_NO_PROFILE, 409)
    }

    const deleted = await trackedPropertyRemoveRepository.deleteForAgent(agentId, trackedId)

    // "Does not exist" and "belongs to another agent" look the same on purpose, so the ids of other
    // agents cannot be probed
    if (deleted === 0) {
      throw new AppError(AGENT_ERROR_TRACKED_NOT_FOUND, 404)
    }
  },
}
