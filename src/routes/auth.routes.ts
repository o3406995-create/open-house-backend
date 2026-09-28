import { Router } from "express"
import { authController } from "../controllers/auth.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new USER account
 *     description: Public registration always assigns the USER role. AGENT accounts cannot be created through this endpoint.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Test User
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: password123
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Email is already registered
 */
router.post("/register", authController.register)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a USER, AGENT, or ADMIN account
 *     description: Verifies credentials and rejects disabled accounts. On success the JWT is set in an HttpOnly cookie named "token" and the authenticated user is returned in the response body.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful. The token is set in an HttpOnly cookie (Set-Cookie header).
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly cookie named "token" containing the JWT
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       example: USER
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Account is disabled
 */
router.post("/login", authController.login)

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out the current user
 *     description: Clears the HttpOnly "token" cookie. Safe to call even when not logged in.
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Logged out. The token cookie is cleared via the Set-Cookie header.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out
 */
router.post("/logout", authController.logout)

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     description: Returns the current user based on the JWT in the "token" cookie.
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Not authenticated
 */
router.get("/me", requireAuth, authController.getCurrentUser)

export default router