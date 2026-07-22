const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require("../lib/tokens");

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
};

async function issueTokenPair(res, userId) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE_MS),
    },
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  return accessToken;
}

async function signup(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "password must be at least 8 characters" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "an account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const accessToken = await issueTokenPair(res, user.id);

  return res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "invalid email or password" });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "invalid email or password" });
  }

  const accessToken = await issueTokenPair(res, user.id);

  return res.status(200).json({
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
  });
}

async function refresh(req, res) {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "no refresh token provided" });
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ error: "invalid or expired refresh token" });
  }

  const tokenHash = hashToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  // Not in the DB means it was already used/rotated or was revoked by a
  // logout — reject even though the JWT signature is still valid.
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: "invalid or expired refresh token" });
  }

  // Rotate: delete the old refresh token and issue a brand new pair. This
  // limits how long a stolen refresh token stays useful.
  //
  // Two requests can race here (e.g. React StrictMode double-firing an
  // effect, or two tabs refreshing at once): both pass the findUnique
  // check above, but only one delete succeeds — the loser hits Prisma's
  // P2025 "record not found" instead of a real error, so treat it as the
  // same "already rotated" case rather than a server error.
  try {
    await prisma.refreshToken.delete({ where: { tokenHash } });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(401).json({ error: "invalid or expired refresh token" });
    }
    throw err;
  }
  const accessToken = await issueTokenPair(res, payload.sub);

  return res.status(200).json({ accessToken });
}

async function logout(req, res) {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
  return res.status(204).send();
}

module.exports = { signup, login, refresh, logout };
