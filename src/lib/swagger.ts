import swaggerJSDoc from "swagger-jsdoc"

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
        url: "http://localhost:3000",
        description: "Local development server",
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