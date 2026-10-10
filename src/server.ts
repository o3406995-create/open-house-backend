import "dotenv/config"
import express from "express"
import cors from "cors"
import swaggerUi from "swagger-ui-express"
import swaggerSpec from "./lib/swagger.js"
import authRoutes from "./routes/auth.routes.js"
import { errorHandler } from "./middleware/errorHandler.js"
import cookieParser from "cookie-parser"
import usersRoutes from "./routes/users.routes.js"
import propertyRoutes from "./routes/property.routes.js"
import { DEFAULT_CORS_ORIGIN, DEFAULT_PORT } from "./constants/server.js"

const app = express()
const PORT = Number(process.env.PORT ?? DEFAULT_PORT)

const allowedOrigins = (process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN).split(",")

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
)

app.use(express.json())
app.use(cookieParser())

app.get("/", (req, res) => {
  res.send("OpenHouse backend is running")
})

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use("/api/auth", authRoutes)

app.use("/api/users", usersRoutes)

app.use("/api/properties", propertyRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`API docs available at http://localhost:${PORT}/api-docs`)
})