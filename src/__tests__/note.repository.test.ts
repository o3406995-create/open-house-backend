import { describe, it, expect, jest, beforeAll } from "@jest/globals"

// Prisma is replaced with a fake, so these tests check the queries that are sent, not the
// database. The repository is loaded AFTER the fake is registered (see
// savedProperty.service.test.ts for why).
const mockSavedFindFirst = jest.fn<(args: unknown) => Promise<unknown>>()
const mockEntryFindFirst = jest.fn<(args: unknown) => Promise<unknown>>()
const mockNoteCreate = jest.fn<(args: unknown) => Promise<unknown>>()
const mockNoteFindFirst = jest.fn<(args: unknown) => Promise<unknown>>()
const mockNoteUpdateMany = jest.fn<(args: unknown) => Promise<{ count: number }>>()
const mockNoteDeleteMany = jest.fn<(args: unknown) => Promise<{ count: number }>>()
// These two would skip the user condition, so they must never be used
const mockNoteUpdate = jest.fn<(args: unknown) => Promise<unknown>>()
const mockNoteDelete = jest.fn<(args: unknown) => Promise<unknown>>()

let noteRepository: typeof import("../repositories/note.repository.js").noteRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      savedProperty: { findFirst: (args: unknown) => mockSavedFindFirst(args) },
      userOpenHouse: { findFirst: (args: unknown) => mockEntryFindFirst(args) },
      note: {
        create: (args: unknown) => mockNoteCreate(args),
        findFirst: (args: unknown) => mockNoteFindFirst(args),
        updateMany: (args: unknown) => mockNoteUpdateMany(args),
        deleteMany: (args: unknown) => mockNoteDeleteMany(args),
        update: (args: unknown) => mockNoteUpdate(args),
        delete: (args: unknown) => mockNoteDelete(args),
      },
    },
  }))

  const loaded = await import("../repositories/note.repository.js")
  noteRepository = loaded.noteRepository
})

describe("noteRepository: finding the target", () => {
  it("only looks at the saved property with that id that belongs to the user", async () => {
    mockSavedFindFirst.mockResolvedValue(null)

    await noteRepository.findSavedPropertyForUser(7, 3)

    expect(mockSavedFindFirst).toHaveBeenCalledWith({
      where: { saved_property_id: 3, user_id: 7 },
      select: { saved_property_id: true, property_id: true },
    })
  })

  it("only looks at the entry with that id that belongs to the user", async () => {
    mockEntryFindFirst.mockResolvedValue(null)

    await noteRepository.findUserOpenHouseForUser(7, 4)

    expect(mockEntryFindFirst).toHaveBeenCalledWith({
      where: { user_openHouse_id: 4, user_id: 7 },
      select: { user_openHouse_id: true, openHouse: { select: { property_id: true } } },
    })
  })
})

describe("noteRepository: the note itself", () => {
  it("creates the note with the data it is given", async () => {
    const data = { user_id: 7, property_id: 11, saved_property_id: 3, content: "hello" }
    mockNoteCreate.mockResolvedValue({ note_id: 5 })

    expect(await noteRepository.create(data)).toEqual({ note_id: 5 })
    expect(mockNoteCreate).toHaveBeenCalledWith({ data })
  })

  it("only looks at the note with that id that belongs to the user", async () => {
    mockNoteFindFirst.mockResolvedValue(null)

    await noteRepository.findForUser(7, 5)

    expect(mockNoteFindFirst).toHaveBeenCalledWith({ where: { note_id: 5, user_id: 7 } })
  })

  it("updates only the note with that id that belongs to the user", async () => {
    mockNoteUpdateMany.mockResolvedValue({ count: 1 })

    await noteRepository.updateContentForUser(7, 5, "new text")

    expect(mockNoteUpdateMany).toHaveBeenCalledTimes(1)
    expect(mockNoteUpdateMany).toHaveBeenCalledWith({
      where: { note_id: 5, user_id: 7 },
      data: { content: "new text" },
    })
    expect(mockNoteUpdate).not.toHaveBeenCalled()
  })

  it("deletes only the note with that id that belongs to the user", async () => {
    mockNoteDeleteMany.mockResolvedValue({ count: 1 })

    await noteRepository.deleteForUser(7, 5)

    expect(mockNoteDeleteMany).toHaveBeenCalledTimes(1)
    expect(mockNoteDeleteMany).toHaveBeenCalledWith({ where: { note_id: 5, user_id: 7 } })
    expect(mockNoteDelete).not.toHaveBeenCalled()
  })

  it("returns how many rows were deleted", async () => {
    mockNoteDeleteMany.mockResolvedValueOnce({ count: 1 })
    expect(await noteRepository.deleteForUser(7, 5)).toBe(1)

    mockNoteDeleteMany.mockResolvedValueOnce({ count: 0 })
    expect(await noteRepository.deleteForUser(7, 5)).toBe(0)
  })
})
