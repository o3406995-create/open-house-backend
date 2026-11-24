import { prisma } from "../lib/prisma.js"

export interface NewNoteRecord {
  user_id: number
  property_id: number
  content: string
  saved_property_id?: number
  user_openhouse_id?: number
}

export const noteRepository = {
  // The user's own saved property; null when it does not exist or belongs to someone else
  findSavedPropertyForUser: (user_id: number, saved_property_id: number) => {
    return prisma.savedProperty.findFirst({
      where: { saved_property_id, user_id },
      select: { saved_property_id: true, property_id: true },
    })
  },

  // The user's own entry in My Open Houses; null when it does not exist or belongs to someone else
  findUserOpenHouseForUser: (user_id: number, user_openHouse_id: number) => {
    return prisma.userOpenHouse.findFirst({
      where: { user_openHouse_id, user_id },
      select: { user_openHouse_id: true, openHouse: { select: { property_id: true } } },
    })
  },

  create: (data: NewNoteRecord) => {
    return prisma.note.create({ data })
  },

  // One of the user's own notes; null when it does not exist or belongs to someone else
  findForUser: (user_id: number, note_id: number) => {
    return prisma.note.findFirst({ where: { note_id, user_id } })
  },

  // Only the user's own note is touched. Whether a row changed is not asked (a driver may count
  // matched or changed rows); the caller reads the note again.
  updateContentForUser: async (user_id: number, note_id: number, content: string) => {
    await prisma.note.updateMany({ where: { note_id, user_id }, data: { content } })
  },

  // Returns how many rows were deleted (0 when it does not exist or belongs to someone else)
  deleteForUser: async (user_id: number, note_id: number) => {
    const result = await prisma.note.deleteMany({ where: { note_id, user_id } })
    return result.count
  },
}
