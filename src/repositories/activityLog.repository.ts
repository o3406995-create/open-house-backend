import { prisma } from "../lib/prisma.js"

export const activityLogRepository = {
  create: (data: {
    user_id: number
    action: "REGISTER" | "LOGIN"
    ip_address?: string | undefined
    user_agent?: string | undefined
  }) => {
    return prisma.activityLog.create({ data: {
        user_id: data.user_id,
        action: data.action,
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null,
    }
   })
  },
}