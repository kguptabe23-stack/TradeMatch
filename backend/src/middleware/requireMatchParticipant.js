const prisma = require("../lib/prisma");
const { asyncHandler } = require("./asyncHandler");

// Same shape as the listing-ownership check from Step 2, generalized to a
// two-sided resource: only the two users on a Match are allowed to read or
// post in its chat. Loads the match once and hangs it on req so downstream
// handlers don't have to fetch it again.
const requireMatchParticipant = asyncHandler(async (req, res, next) => {
  const match = await prisma.match.findUnique({ where: { id: req.params.matchId } });

  if (!match) {
    return res.status(404).json({ error: "match not found" });
  }
  if (match.userAId !== req.userId && match.userBId !== req.userId) {
    return res.status(403).json({ error: "you are not part of this match" });
  }

  req.match = match;
  return next();
});

module.exports = { requireMatchParticipant };
