import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import {
  NOTE_ERROR_ALREADY_EXISTS,
  NOTE_ERROR_NOT_FOUND,
  NOTE_ERROR_TARGET,
  NOTE_ERROR_TARGET_NOT_FOUND,
} from "../constants/note.js"

// The repository is replaced with a fake, so these tests never touch the database. The service
// is loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockFindSaved = jest.fn<(userId: number, id: number) => Promise<unknown>>()
const mockFindEntry = jest.fn<(userId: number, id: number) => Promise<unknown>>()
const mockCreate = jest.fn<(data: unknown) => Promise<unknown>>()
const mockFindNote = jest.fn<(userId: number, id: number) => Promise<unknown>>()
const mockUpdate = jest.fn<(userId: number, id: number, content: string) => Promise<void>>()
const mockDelete = jest.fn<(userId: number, id: number) => Promise<number>>()

let noteService: typeof import("../services/note.service.js").noteService

beforeAll(async () => {
  jest.doMock("../repositories/note.repository.js", () => ({
    noteRepository: {
      findSavedPropertyForUser: (userId: number, id: number) => mockFindSaved(userId, id),
      findUserOpenHouseForUser: (userId: number, id: number) => mockFindEntry(userId, id),
      create: (data: unknown) => mockCreate(data),
      findForUser: (userId: number, id: number) => mockFindNote(userId, id),
      updateContentForUser: (userId: number, id: number, content: string) =>
        mockUpdate(userId, id, content),
      deleteForUser: (userId: number, id: number) => mockDelete(userId, id),
    },
  }))

  const loaded = await import("../services/note.service.js")
  noteService = loaded.noteService
})

const CREATED = new Date("2026-11-24T00:00:00.000Z")
const UPDATED = new Date("2026-11-24T01:00:00.000Z")

function noteRow(overrides: Record<string, unknown> = {}) {
  return {
    note_id: 5,
    user_id: 7,
    property_id: 11,
    saved_property_id: 3,
    user_openhouse_id: null,
    content: "Call the agent",
    created_at: CREATED,
    updated_at: UPDATED,
    ...overrides,
  }
}

const NOTE_DTO = {
  noteId: 5,
  savedPropertyId: 3,
  userOpenHouseId: null,
  content: "Call the agent",
  createdAt: CREATED,
  updatedAt: UPDATED,
}

describe("noteService.create", () => {
  it("writes a note on a saved property of the user", async () => {
    mockFindSaved.mockResolvedValue({ saved_property_id: 3, property_id: 11 })
    mockCreate.mockResolvedValue(noteRow())

    const note = await noteService.create(7, { savedPropertyId: 3, content: "Call the agent" })

    expect(note).toEqual(NOTE_DTO)
    expect(mockFindSaved).toHaveBeenCalledWith(7, 3)
    expect(mockCreate).toHaveBeenCalledWith({
      user_id: 7,
      property_id: 11,
      saved_property_id: 3,
      content: "Call the agent",
    })
  })

  it("writes a note on an entry of the user in My Open Houses, with the property of its open house", async () => {
    mockFindEntry.mockResolvedValue({ user_openHouse_id: 4, openHouse: { property_id: 12 } })
    mockCreate.mockResolvedValue(
      noteRow({ saved_property_id: null, user_openhouse_id: 4, property_id: 12 }),
    )

    const note = await noteService.create(7, { userOpenHouseId: 4, content: "Call the agent" })

    expect(note).toMatchObject({ savedPropertyId: null, userOpenHouseId: 4 })
    expect(mockFindEntry).toHaveBeenCalledWith(7, 4)
    expect(mockCreate).toHaveBeenCalledWith({
      user_id: 7,
      property_id: 12,
      user_openhouse_id: 4,
      content: "Call the agent",
    })
  })

  it("answers 404 when the saved property does not exist or is not the user's, and writes nothing", async () => {
    mockFindSaved.mockResolvedValue(null)

    await expect(
      noteService.create(7, { savedPropertyId: 3, content: "x" }),
    ).rejects.toMatchObject({ statusCode: 404 })
    await expect(
      noteService.create(7, { savedPropertyId: 3, content: "x" }),
    ).rejects.toThrow(NOTE_ERROR_TARGET_NOT_FOUND)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("answers 404 when the entry does not exist or is not the user's, and writes nothing", async () => {
    mockFindEntry.mockResolvedValue(null)

    await expect(
      noteService.create(7, { userOpenHouseId: 4, content: "x" }),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("answers 409 when the item has a note already", async () => {
    mockFindSaved.mockResolvedValue({ saved_property_id: 3, property_id: 11 })
    mockCreate.mockRejectedValue({ code: "P2002" })

    await expect(
      noteService.create(7, { savedPropertyId: 3, content: "x" }),
    ).rejects.toMatchObject({ statusCode: 409 })
    await expect(
      noteService.create(7, { savedPropertyId: 3, content: "x" }),
    ).rejects.toThrow(NOTE_ERROR_ALREADY_EXISTS)
  })

  it("passes any other error on", async () => {
    mockFindSaved.mockResolvedValue({ saved_property_id: 3, property_id: 11 })
    mockCreate.mockRejectedValue(new Error("database is down"))

    await expect(
      noteService.create(7, { savedPropertyId: 3, content: "x" }),
    ).rejects.toThrow("database is down")
  })

  it.each([
    ["no target", { content: "x" }],
    ["two targets", { savedPropertyId: 3, userOpenHouseId: 4, content: "x" }],
  ])("answers 400 for %s and looks nothing up", async (_label, input) => {
    await expect(noteService.create(7, input)).rejects.toMatchObject({ statusCode: 400 })
    await expect(noteService.create(7, input)).rejects.toThrow(NOTE_ERROR_TARGET)
    expect(mockFindSaved).not.toHaveBeenCalled()
    expect(mockFindEntry).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe("noteService.update", () => {
  it("changes the text and answers with the note", async () => {
    mockUpdate.mockResolvedValue(undefined)
    mockFindNote.mockResolvedValue(noteRow({ content: "New text" }))

    const note = await noteService.update(7, 5, "New text")

    expect(mockUpdate).toHaveBeenCalledWith(7, 5, "New text")
    expect(mockFindNote).toHaveBeenCalledWith(7, 5)
    expect(note).toMatchObject({ noteId: 5, content: "New text" })
  })

  it("answers 404 when the note does not exist or is not the user's", async () => {
    mockUpdate.mockResolvedValue(undefined)
    mockFindNote.mockResolvedValue(null)

    await expect(noteService.update(7, 5, "x")).rejects.toMatchObject({ statusCode: 404 })
    await expect(noteService.update(7, 5, "x")).rejects.toThrow(NOTE_ERROR_NOT_FOUND)
  })

  it("passes a repository error on", async () => {
    mockUpdate.mockRejectedValue(new Error("database is down"))

    await expect(noteService.update(7, 5, "x")).rejects.toThrow("database is down")
  })
})

describe("noteService.remove", () => {
  it("deletes the user's own note", async () => {
    mockDelete.mockResolvedValue(1)

    await expect(noteService.remove(7, 5)).resolves.toBeUndefined()
    expect(mockDelete).toHaveBeenCalledWith(7, 5)
  })

  it("answers 404 when nothing was deleted", async () => {
    mockDelete.mockResolvedValue(0)

    await expect(noteService.remove(7, 5)).rejects.toMatchObject({ statusCode: 404 })
    await expect(noteService.remove(7, 5)).rejects.toThrow(NOTE_ERROR_NOT_FOUND)
  })
})
