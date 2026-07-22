const { Router } = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

// A minimal protected route so we have something to prove the access
// token / requireAuth middleware actually works end to end.
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    return res.status(200).json({ user });
  })
);

module.exports = router;
