const prisma = require("../lib/prisma");
const { detectMatches } = require("../services/matches.service");

// Listings to show in the swipe deck: active, not owned by the caller, and
// not already swiped on (in either direction) — swiping is a one-shot
// decision per listing, so once it's judged it shouldn't come back.
async function feed(req, res) {
  const alreadySwiped = await prisma.swipe.findMany({
    where: { swiperUserId: req.userId },
    select: { listingId: true },
  });

  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      ownerId: { not: req.userId },
      id: { notIn: alreadySwiped.map((s) => s.listingId) },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { owner: { select: { id: true, name: true } } },
  });

  return res.status(200).json({ listings });
}

async function create(req, res) {
  const { listingId, direction } = req.body;

  if (!listingId || !["LEFT", "RIGHT"].includes(direction)) {
    return res
      .status(400)
      .json({ error: "listingId and direction ('LEFT' or 'RIGHT') are required" });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "ACTIVE") {
    return res.status(404).json({ error: "listing not found" });
  }
  if (listing.ownerId === req.userId) {
    return res.status(400).json({ error: "you cannot swipe on your own listing" });
  }

  try {
    const swipe = await prisma.swipe.create({
      data: { swiperUserId: req.userId, listingId, direction },
    });

    const matches =
      direction === "RIGHT"
        ? await detectMatches({ swiperUserId: req.userId, listing })
        : [];

    return res.status(201).json({ swipe, matches });
  } catch (err) {
    // Unique constraint on [swiperUserId, listingId] — this is the DB
    // itself enforcing "one swipe per listing per user," not app code.
    if (err.code === "P2002") {
      return res.status(409).json({ error: "you already swiped on this listing" });
    }
    throw err;
  }
}

module.exports = { feed, create };
