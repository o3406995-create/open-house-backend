import { prisma } from "../lib/prisma.js"

export const trackedPropertyRemoveRepository = {
  // Removes one row of the watchlist, but only when it is the agent's own. Returns how many rows were
  // removed (0 when it does not exist or belongs to another agent). Only the row goes: the property it
  // points to is never touched, because other agents and users may refer to it as well.
  deleteForAgent: async (agentId: number, trackedId: number) => {
    const result = await prisma.agentTrackedProperty.deleteMany({
      where: { tracked_id: trackedId, agent_id: agentId },
    })
    return result.count
  },
}
