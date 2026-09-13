import express from "express"
import swaggerUi from "swagger-ui-express"
import swaggerSpec from "./lib/swagger.js"
import authRoutes from "./routes/auth.routes.js"
import { errorHandler } from "./middleware/errorHandler.js"

const app = express()
const PORT = 3000

app.use(express.json())

app.get("/", (req, res) => {
  res.send("OpenHouse backend is running")
})

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use("/api/auth", authRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`API docs available at http://localhost:${PORT}/api-docs`)
})