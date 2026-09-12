require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const listingsRoutes = require("./routes/listings.routes");
const swipesRoutes = require("./routes/swipes.routes");
const matchesRoutes = require("./routes/matches.routes");
const uploadsRoutes = require("./routes/uploads.routes");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/swipes", swipesRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/uploads", uploadsRoutes);

// Last-resort safety net
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: "internal server error",
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});