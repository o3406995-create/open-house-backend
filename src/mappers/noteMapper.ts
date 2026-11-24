export interface NoteRow {
  note_id: number
  saved_property_id: number | null
  user_openhouse_id: number | null
  content: string
  created_at: Date
  updated_at: Date
}

export function toNoteDTO(row: NoteRow) {
  return {
    noteId: row.note_id,
    savedPropertyId: row.saved_property_id,
    userOpenHouseId: row.user_openhouse_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// A note as it appears inside a list: the saved properties and My Open Houses lists carry one
// per item, or null when the item has none
export interface NoteSummaryRow {
  note_id: number
  content: string
  updated_at: Date
}

export function noteSummaryOf(row: NoteSummaryRow | null | undefined) {
  if (!row) return null

  return { noteId: row.note_id, content: row.content, updatedAt: row.updated_at }
}
