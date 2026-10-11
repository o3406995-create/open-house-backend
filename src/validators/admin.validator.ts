import { z } from "zod"
import { PASSWORD_MIN_LENGTH } from "../constants/auth.js"

export const createAgentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
})

export type CreateAgentInput = z.infer<typeof createAgentSchema>