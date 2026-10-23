import { prisma } from "../lib/prisma.js"

export type ManagedRole = "USER" | "AGENT"

export interface ListUsersParams {
  role?: ManagedRole | undefined
  page: number
  pageSize: number
}

// Explicit select so password_hash can never leak through list results
const PUBLIC_USER_SELECT = {
  user_id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  created_at: true,
  updated_at: true,
} as const

export const userRepository = {
  // Includes soft-deleted accounts on purpose: a deleted account still owns its email,
  // so registration returns 409 and login can recognise it.
  findByEmail: (email: string) => {
    return prisma.user.findUnique({ where: { email } })
  },

  // Raw lookup, includes soft-deleted accounts (callers decide how to treat them).
  findById: (user_id: number) => {
    return prisma.user.findUnique({ where: { user_id } })
  },

  // Excludes soft-deleted accounts. Used by auth checks.
  findActiveById: (user_id: number) => {
    return prisma.user.findFirst({ where: { user_id, deleted_at: null } })
  },

  create: (data: {
    name: string
    email: string
    password_hash: string
    role?: "USER" | "AGENT" | "ADMIN"
  }) => {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash: data.password_hash,
        role: data.role ?? "USER",
      },
    })
  },

  // Never returns ADMIN accounts or soft-deleted accounts.
  getAllUsers: async ({ role, page, pageSize }: ListUsersParams) => {
    const where = {
      deleted_at: null,
      role: role ?? { not: "ADMIN" as const },
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: PUBLIC_USER_SELECT,
        orderBy: [{ created_at: "desc" }, { user_id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])

    return { users, total }
  },

  // The WHERE clause itself refuses ADMIN and already-deleted rows,
  // so these guarantees hold even if a caller forgets to check.
  // Returns true if a row was deleted.
  softDelete: async (user_id: number): Promise<boolean> => {
    const { count } = await prisma.user.updateMany({
      where: { user_id, deleted_at: null, role: { not: "ADMIN" } },
      data: { deleted_at: new Date() },
    })
    return count > 0
  },
}