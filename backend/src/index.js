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

app.use(
  cors({
    origin: ['http://localhost:5173', 'https://barter-virid.vercel.app'], // Vite dev server
    credentials: true, // allow the refresh-token cookie to be sent
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

// Last-resort safety net: any error passed to next() (including ones
// caught by asyncHandler) lands here instead of crashing the process.
// The real error goes to the server log; the client just gets a generic
// 500 — never leak internals like stack traces or DB error shapes.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
