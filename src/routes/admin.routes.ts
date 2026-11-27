import { Router } from "express"
import { adminController } from "../controllers/admin.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"
import { requireAdmin } from "../middleware/requireRole.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/admin/agents:
 *   post:
 *     summary: Create a new AGENT account with its profile
 *     description: >
 *       Admin-only. This is the only way to create an AGENT account; public registration always
 *       assigns USER. The account always comes with a profile in an agency: either one that exists
 *       (agencyId) or a new one (agency), never both. A new agency whose name is already taken in
 *       the same postcode (compared without regard to capitals and spacing) is not made twice: the
 *       existing one is used, and agencyCreated says which happened. Everything is made in one
 *       transaction.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
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
 *               - licenseNumber
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               licenseNumber:
 *                 type: string
 *                 maxLength: 50
 *               agencyId:
 *                 type: integer
 *                 minimum: 1
 *                 description: An agency that exists. Give this or agency.
 *               agency:
 *                 type: object
 *                 description: A new agency. Give this or agencyId.
 *                 required:
 *                   - name
 *                   - suburb
 *                   - state
 *                   - postcode
 *                 properties:
 *                   name:
 *                     type: string
 *                   address:
 *                     type: string
 *                   suburb:
 *                     type: string
 *                   state:
 *                     type: string
 *                     enum: [ACT, NSW, NT, QLD, SA, TAS, VIC, WA]
 *                   postcode:
 *                     type: string
 *                     example: "4000"
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   website:
 *                     type: string
 *                     description: A link that starts with https://
 *     responses:
 *       "201":
 *         description: Returned as { user, agentProfile, agencyCreated }
 *       "400":
 *         description: Validation failed
 *       "401":
 *         description: Not authenticated
 *       "403":
 *         description: Not an admin
 *       "404":
 *         description: The agency does not exist
 *       "409":
 *         description: Email already registered
 */
router.post("/agents", requireAuth, requireAdmin, adminController.createAgent)

/**
 * @swagger
 * /api/admin/agencies:
 *   get:
 *     summary: List the agencies
 *     description: >
 *       Admin-only. The agencies an admin can choose from when creating an agent, by name, with the
 *       number of agents of each. Whether the search ignores capitals depends on the collation of
 *       the database.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: A part of the name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *     responses:
 *       "200":
 *         description: Returned as { agencies, total, page, pageSize }
 *       "400":
 *         description: Invalid q, page or pageSize
 *       "401":
 *         description: Not authenticated
 *       "403":
 *         description: Not an admin
 */
router.get("/agencies", requireAuth, requireAdmin, adminController.listAgencies)

export default router
