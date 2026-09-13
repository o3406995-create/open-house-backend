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
  },
  apis: ["src/routes/*.routes.ts"],
})

export default swaggerSpec