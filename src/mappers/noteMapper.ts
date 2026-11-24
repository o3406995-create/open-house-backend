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
