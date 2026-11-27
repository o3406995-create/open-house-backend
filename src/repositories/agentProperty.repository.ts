import { prisma } from "../lib/prisma.js"
import type { PropertyRecordInput } from "../mappers/propertyRecordMapper.js"

export const agentPropertyRepository = {
  // The profile of an agent account, or null when it has none. What an agent tracks hangs on the profile.
  findAgentId: async (userId: number) => {
    const profile = await prisma.agentProfile.findUnique({
      where: { user_id: userId },
      select: { agent_id: true },
    })
    return profile?.agent_id ?? null
  },

  // One transaction: refresh the property snapshot, then create the tracking row unless it exists.
  // Returns created = false for a property that the agent tracks already.
  trackForAgent: (agentId: number, record: PropertyRecordInput) => {
    return prisma.$transaction(async (tx) => {
      const property = await tx.property.upsert({
        where: {
          source_external_id: { source: record.source, external_id: record.external_id },
        },
        create: record,
        update: record,
      })

      const existing = await tx.agentTrackedProperty.findUnique({
        where: {
          agent_id_property_id: { agent_id: agentId, property_id: property.property_id },
        },
      })

      if (existing) {
        return { created: false, tracked: existing }
      }

      const tracked = await tx.agentTrackedProperty.create({
        data: { agent_id: agentId, property_id: property.property_id },
      })

      return { created: true, tracked }
    })
  },
}
