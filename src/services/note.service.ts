import { noteRepository, type NewNoteRecord } from "../repositories/note.repository.js"
import { AppError } from "../lib/AppError.js"
import { toNoteDTO } from "../mappers/noteMapper.js"
import { isUniqueConstraintError } from "../helper/prismaErrors.js"
import {
  NOTE_ERROR_ALREADY_EXISTS,
  NOTE_ERROR_NOT_FOUND,
  NOTE_ERROR_TARGET,
  NOTE_ERROR_TARGET_NOT_FOUND,
} from "../constants/note.js"

// The validator's result: a target that was not sent is undefined (this project does not allow
// undefined for an optional property unless it is written out)
export interface CreateNoteInput {
  savedPropertyId?: number | undefined
  userOpenHouseId?: number | undefined
  content: string
}

type NoteTarget = { savedPropertyId: number } | { userOpenHouseId: number }

// The validator already insists on exactly one target; this keeps the service safe on its own
function targetOf(input: CreateNoteInput): NoteTarget {
  const { savedPropertyId, userOpenHouseId } = input

  if (savedPropertyId !== undefined && userOpenHouseId === undefined) {
    return { savedPropertyId }
  }
  if (userOpenHouseId !== undefined && savedPropertyId === undefined) {
    return { userOpenHouseId }
  }
  throw new AppError(NOTE_ERROR_TARGET, 400)
}

// Looks the target up among the user's own rows. "Does not exist" and "belongs to someone
// else" look the same on purpose, so ids of other users cannot be probed.
async function recordFor(
  userId: number,
  target: NoteTarget,
  content: string,
): Promise<NewNoteRecord> {
  if ("savedPropertyId" in target) {
    const saved = await noteRepository.findSavedPropertyForUser(userId, target.savedPropertyId)
    if (!saved) {
      throw new AppError(NOTE_ERROR_TARGET_NOT_FOUND, 404)
    }
    return {
      user_id: userId,
      property_id: saved.property_id,
      saved_property_id: saved.saved_property_id,
      content,
    }
  }

  const entry = await noteRepository.findUserOpenHouseForUser(userId, target.userOpenHouseId)
  if (!entry) {
    throw new AppError(NOTE_ERROR_TARGET_NOT_FOUND, 404)
  }
  return {
    user_id: userId,
    property_id: entry.openHouse.property_id,
    user_openhouse_id: entry.user_openHouse_id,
    content,
  }
}

export const noteService = {
  create: async (userId: number, input: CreateNoteInput) => {
    const record = await recordFor(userId, targetOf(input), input.content)

    try {
      return toNoteDTO(await noteRepository.create(record))
    } catch (err) {
      // Each saved property and each entry has at most one note: this is a second note, or the
      // loser of two requests at the same moment
      if (isUniqueConstraintError(err)) {
        throw new AppError(NOTE_ERROR_ALREADY_EXISTS, 409)
      }
      throw err
    }
  },

  update: async (userId: number, noteId: number, content: string) => {
    await noteRepository.updateContentForUser(userId, noteId, content)

    // Read again: this also answers for a note that does not exist or is not the user's
    const note = await noteRepository.findForUser(userId, noteId)
    if (!note) {
      throw new AppError(NOTE_ERROR_NOT_FOUND, 404)
    }
    return toNoteDTO(note)
  },

  remove: async (userId: number, noteId: number) => {
    const deleted = await noteRepository.deleteForUser(userId, noteId)

    if (deleted === 0) {
      throw new AppError(NOTE_ERROR_NOT_FOUND, 404)
    }
  },
}
