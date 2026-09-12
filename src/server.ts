import express from "express"
import authRoutes from "./routes/auth.routes.js"
import { errorHandler } from "./middleware/errorHandler.js"

const app = express()
const PORT = 3000

app.use(express.json())

app.get("/", (req, res) => {
  res.send("OpenHouse backend is running")
})

app.use("/api/auth", authRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})