const prisma = require("../lib/prisma");
const { detectMatches } = require("../services/matches.service");

const VALID_DIRECTIONS = ["LEFT", "RIGHT"];
const FEED_LIMIT = 20;

// Listings to show in the swipe deck:
// - active
// - not owned by the caller
// - not already swiped on
async function feed(req, res) {
  const alreadySwiped = await prisma.swipe.findMany({
    where: {
      swiperUserId: req.userId,
    },
    select: {
      listingId: true,
    },
  });

  const excludedListingIds = alreadySwiped.map(
    (swipe) => swipe.listingId
  );

  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      ownerId: {
        not: req.userId,
      },
      ...(excludedListingIds.length > 0 && {
        id: {
          notIn: excludedListingIds,
        },
      }),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: FEED_LIMIT,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return res.status(200).json({ listings });
}

async function create(req, res) {
  const { listingId, direction } = req.body;

  // Basic request validation
  if (
    typeof listingId !== "string" ||
    !listingId.trim() ||
    !VALID_DIRECTIONS.includes(direction)
  ) {
    return res.status(400).json({
      error:
        "listingId and direction ('LEFT' or 'RIGHT') are required",
    });
  }

  const listing = await prisma.listing.findUnique({
    where: {
      id: listingId,
    },
  });

  // Listing must exist and remain active
  if (!listing || listing.status !== "ACTIVE") {
    return res.status(404).json({
      error: "listing not found",
    });
  }

  // Prevent self-swiping
  if (listing.ownerId === req.userId) {
    return res.status(400).json({
      error: "you cannot swipe on your own listing",
    });
  }

  try {
    /*
     * The database unique constraint on:
     *
     * [swiperUserId, listingId]
     *
     * guarantees that one user can only swipe once
     * on a particular listing.
     */
    const swipe = await prisma.swipe.create({
      data: {
        swiperUserId: req.userId,
        listingId,
        direction,
      },
    });

    /*
     * Only RIGHT swipes can produce a match.
     */
    let matches = [];

    if (direction === "RIGHT") {
      matches = await detectMatches({
        swiperUserId: req.userId,
        listing,
      });
    }

    return res.status(201).json({
      swipe,
      matches,
    });
  } catch (err) {
    /*
     * Prisma P2002 = unique constraint violation.
     *
     * This can happen even if two requests arrive
     * almost simultaneously. The database remains the
     * final source of truth.
     */
    if (err.code === "P2002") {
      return res.status(409).json({
        error: "you already swiped on this listing",
      });
    }

    throw err;
  }
}

module.exports = {
  feed,
  create,
};