const prisma = require("../lib/prisma");

/*
 * Sort the pair so the same two listings always resolve
 * to the same A/B slots regardless of which side triggered
 * the match.
 */
function canonicalPair(
  listingId1,
  ownerId1,
  listingId2,
  ownerId2
) {
  if (listingId1 < listingId2) {
    return {
      listingAId: listingId1,
      userAId: ownerId1,
      listingBId: listingId2,
      userBId: ownerId2,
    };
  }

  return {
    listingAId: listingId2,
    userAId: ownerId2,
    listingBId: listingId1,
    userBId: ownerId1,
  };
}

/*
 * Called after a RIGHT swipe.
 *
 * A match occurs when:
 *
 * User A RIGHT-swipes User B's listing
 * +
 * User B RIGHT-swiped User A's listing
 * =
 * Match
 */
async function detectMatches({
  swiperUserId,
  listing,
}) {
  if (!listing) {
    return [];
  }

  /*
   * The current user just RIGHT-swiped `listing`.
   *
   * Therefore:
   *
   * listing.ownerId = the OTHER user
   * swiperUserId   = the CURRENT user
   *
   * We now look for RIGHT swipes made by the
   * other user on listings owned by the current user.
   */
  const reciprocalSwipes = await prisma.swipe.findMany({
    where: {
      swiperUserId: listing.ownerId,
      direction: "RIGHT",

      listing: {
        ownerId: swiperUserId,
        status: "ACTIVE",
      },
    },

    select: {
      listingId: true,
    },
  });

  const createdMatches = [];

  for (const {
    listingId: reciprocalListingId,
  } of reciprocalSwipes) {
    /*
     * Prevent a listing from matching with itself.
     */
    if (reciprocalListingId === listing.id) {
      continue;
    }

    /*
     * Make sure the reciprocal listing still exists
     * and still belongs to the current swiper.
     */
    const reciprocalListing =
      await prisma.listing.findUnique({
        where: {
          id: reciprocalListingId,
        },

        select: {
          id: true,
          ownerId: true,
          status: true,
        },
      });

    if (
      !reciprocalListing ||
      reciprocalListing.ownerId !== swiperUserId ||
      reciprocalListing.status !== "ACTIVE"
    ) {
      continue;
    }

    /*
     * Create a deterministic A/B listing pair.
     */
    const pair = canonicalPair(
      listing.id,
      listing.ownerId,
      reciprocalListing.id,
      swiperUserId
    );

    try {
      const match = await prisma.match.create({
        data: pair,

        include: {
          listingA: true,
          listingB: true,

          userA: {
            select: {
              id: true,
              name: true,
            },
          },

          userB: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      createdMatches.push(match);
    } catch (err) {
      /*
       * P2002 means this listing pair already has
       * a match. That's safe to ignore.
       */
      if (err.code === "P2002") {
        continue;
      }

      throw err;
    }
  }

  return createdMatches;
}

module.exports = {
  detectMatches,
};