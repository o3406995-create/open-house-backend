import { prisma } from "../lib/prisma.js"

export const userRepository = {
  findByEmail: (email: string) => {
    return prisma.user.findUnique({ where: { email } })
  },

  findById: (user_id: number) => {
    return prisma.user.findUnique({ where: { user_id } })
  },

  create: (data: { name: string; email: string; password_hash: string }) => {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash: data.password_hash,
        role: "USER",
      },
    })
  },
}