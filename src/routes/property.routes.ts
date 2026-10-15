import { Router } from "express"
import { propertyController } from "../controllers/property.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/properties/search:
 *   post:
 *     summary: Search properties
 *     description: Uses mock listings unless PROPERTY_DATA_SOURCE is set to domain. Requires authentication.
 *     tags:
 *       - Properties
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *               - radiusMeters
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: -27.4698
 *               longitude:
 *                 type: number
 *                 example: 153.0251
 *               radiusMeters:
 *                 type: number
 *                 example: 5000
 *               minBedrooms:
 *                 type: integer
 *                 example: 2
 *               maxPrice:
 *                 type: number
 *                 example: 800000
 *               propertyType:
 *                 type: string
 *                 example: House
 *     responses:
 *       200:
 *         description: Matching properties
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Not authenticated
 */
router.post("/search", requireAuth, propertyController.search)

/**
 * @swagger
 * /api/properties/{externalId}:
 *   get:
 *     summary: Get one property by external id
 *     description: Requires authentication.
 *     tags:
 *       - Properties
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: externalId
 *         required: true
 *         schema:
 *           type: string
 *         example: mock-1
 *     responses:
 *       200:
 *         description: Property found
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Property not found
 */
router.get("/:externalId", requireAuth, propertyController.getById)

export default router