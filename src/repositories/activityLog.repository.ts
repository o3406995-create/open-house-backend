import { prisma } from "../lib/prisma.js"

export const activityLogRepository = {
  create: (data: {
    user_id?: number | undefined
    action: "REGISTER" | "LOGIN"
    success: boolean
    message?: string | undefined
    ip_address?: string | undefined
    user_agent?: string | undefined
  }) => {
    return prisma.activityLog.create({ data: {
        action: data.action,
        success: data.success,
        message: data.message ?? null,
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null,
        ...(data.user_id !== undefined
          ? { user: { connect: { user_id: data.user_id }}}
          : {}
        ),
    }
   })
  },
}