import swaggerJSDoc from "swagger-jsdoc"
import { DEFAULT_PORT } from "../constants/server.js"

const apiBaseUrl =
  process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? DEFAULT_PORT}`

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "OpenHouse API",
      version: "1.0.0",
      description: "API documentation for the OpenHouse backend",
    },
    servers: [
      {
        url: apiBaseUrl,
        description: "API server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token",
          description: "JWT stored in an HttpOnly cookie named 'token', set by /api/auth/login or /api/auth/register.",
        },
      },
    },
  },
  apis: ["src/routes/*.routes.ts"],
})

export default swaggerSpec