import { PrismaClient } from "../generated/prisma/client.js"

// Provide an explicit options object to satisfy the generated PrismaClient constructor signature
const prisma = new PrismaClient({} as any)

export const userRepository = {
  findByEmail: (email: string) => {
    return prisma.user.findUnique({ where: { email } })
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