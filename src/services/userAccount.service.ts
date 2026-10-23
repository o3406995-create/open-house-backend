import { userRepository, type ManagedRole } from "../repositories/user.repository.js"
import { AppError } from "../lib/AppError.js"
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  USER_ERROR_NOT_FOUND,
  USER_ERROR_ADMIN_PROTECTED,
} from "../constants/user.js"

interface ListUsersInput {
  role?: ManagedRole | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export const userAccountService = {
  listUsers: async (input: ListUsersInput) => {
    const page = Math.max(1, Math.floor(input.page ?? DEFAULT_PAGE))
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.floor(input.pageSize ?? DEFAULT_PAGE_SIZE)),
    )

    const { users, total } = await userRepository.getAllUsers({
      role: input.role,
      page,
      pageSize,
    })

    return { users, total, page, pageSize }
  },

  // Shared guard: #68/#71 (update) should call this too, so ADMIN accounts
  // are protected from modification as well as deletion.
  getManageableUser: async (userId: number) => {
    const target = await userRepository.findById(userId)

    if (!target || target.deleted_at) {
      throw new AppError(USER_ERROR_NOT_FOUND, 404)
    }
    if (target.role === "ADMIN") {
      throw new AppError(USER_ERROR_ADMIN_PROTECTED, 403)
    }

    return target
  },

  // Who may call this (ADMIN only) is enforced by requireAdmin on the route in #69/#72.
  deleteUser: async (userId: number) => {
    await userAccountService.getManageableUser(userId)

    const deleted = await userRepository.softDelete(userId)
    if (!deleted) {
      // Lost a race with a concurrent delete
      throw new AppError(USER_ERROR_NOT_FOUND, 404)
    }
  },
}