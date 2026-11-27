import { prisma } from "../lib/prisma.js"

export const trackedPropertyListRepository = {
  // The watchlist of an agent, newest first, with the stored snapshot of each property. Only rows that
  // can be matched to an external listing are returned, and the total counts only those. Nothing about
  // any user is loaded.
  listForAgent: async (agentId: number, page: number, pageSize: number) => {
    const where = {
      agent_id: agentId,
      property: { external_id: { not: null }, source: { not: null } },
    }

    const [records, total] = await prisma.$transaction([
      prisma.agentTrackedProperty.findMany({
        where,
        include: { property: true },
        orderBy: [{ created_at: "desc" }, { tracked_id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.agentTrackedProperty.count({ where }),
    ])

    return { records, total }
  },
}
