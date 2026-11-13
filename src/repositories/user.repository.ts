import { prisma } from "../lib/prisma.js"

export type ManagedRole = "USER" | "AGENT"

export interface ListUsersParams {
  role?: ManagedRole | undefined
  page: number
  pageSize: number
}

// Single source of truth for "not deleted". Every business query on User
// must spread this, so deleted accounts can never leak into results.
const NOT_DELETED = { is_deleted: false } as const

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
  // Includes deleted accounts on purpose: a deleted account still owns its email,
  // so registration returns 409 and login can recognise it.
  findByEmail: (email: string) => {
    return prisma.user.findUnique({ where: { email } })
  },

  // Raw lookup, includes deleted accounts (callers decide how to treat them).
  findById: (user_id: number) => {
    return prisma.user.findUnique({ where: { user_id } })
  },

  // Excludes deleted accounts. Used by auth checks.
  findActiveById: (user_id: number) => {
    return prisma.user.findFirst({ where: { user_id, ...NOT_DELETED } })
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

  // Never returns ADMIN accounts or deleted accounts.
  getAllUsers: async ({ role, page, pageSize }: ListUsersParams) => {
    const where = {
      ...NOT_DELETED,
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

  // Check-and-update in ONE atomic statement: the WHERE only matches a row that is
  // not deleted and not ADMIN. Two concurrent deletes cannot both succeed.
  // is_deleted and deleted_at are always written together, here and nowhere else.
  // Returns true if a row was deleted, false if nothing matched.
  softDelete: async (user_id: number): Promise<boolean> => {
    const { count } = await prisma.user.updateMany({
      where: { user_id, ...NOT_DELETED, role: { not: "ADMIN" } },
      data: { is_deleted: true, deleted_at: new Date() },
    })
    return count > 0
  },
}