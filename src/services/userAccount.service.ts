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

  // Shared guard: update APIs (#68/#71) should call this too, so ADMIN accounts
  // are protected from modification as well as deletion.
  getManageableUser: async (userId: number) => {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError(USER_ERROR_NOT_FOUND, 404)
    }

    const target = await userRepository.findById(userId)

    if (!target || target.is_deleted) {
      throw new AppError(USER_ERROR_NOT_FOUND, 404)
    }
    if (target.role === "ADMIN") {
      throw new AppError(USER_ERROR_ADMIN_PROTECTED, 403)
    }

    return target
  },

  // Who may call this (ADMIN only) is enforced by requireAdmin on the route in #69/#72.
  deleteUser: async (userId: number) => {
    // is_deleted = true  -> 404 "not found or already deleted"
    // is_deleted = false -> continue
    await userAccountService.getManageableUser(userId)

    const deleted = await userRepository.softDelete(userId)
    if (!deleted) {
      // Another request deleted it between the check and the update
      throw new AppError(USER_ERROR_NOT_FOUND, 404)
    }
  },
}