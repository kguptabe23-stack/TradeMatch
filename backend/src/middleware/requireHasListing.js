const prisma = require("../lib/prisma");
const { asyncHandler } = require("./asyncHandler");

// The Hinge rule: you don't get to browse or swipe on other people's stuff
// until you've put your own stuff up. An archived-only listing doesn't
// count — if nothing you own is currently tradeable, you have nothing to
// offer, so you shouldn't be swiping.
const requireHasListing = asyncHandler(async (req, res, next) => {
  const count = await prisma.listing.count({
    where: { ownerId: req.userId, status: "ACTIVE" },
  });

  if (count === 0) {
    return res.status(403).json({
      error: "create a listing before you can browse or swipe on others",
    });
  }

  return next();
});

module.exports = { requireHasListing };
