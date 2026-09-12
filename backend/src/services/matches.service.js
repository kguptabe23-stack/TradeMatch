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
 * Call this after recording a RIGHT swipe.
 *
 * A match is a specific pair of listings:
 *
 * User A RIGHT-swipes on User B's listing
 * +
 * User B RIGHT-swiped on User A's listing
 * =
 * Match
 */
async function detectMatches({
  swiperUserId,
  listing,
}) {
  /*
   * Defensive ownership check.
   *
   * The listing being matched must belong to the
   * user who owns it. This protects the service if
   * it is ever reused from another controller.
   */
  if (!listing || listing.ownerId !== swiperUserId) {
    return [];
  }

  /*
   * Find listings owned by the current swiper that
   * the other user has already liked.
   *
   * Example:
   *
   * Current user owns:
   *   Sony headphones
   *
   * Other user previously RIGHT-swiped:
   *   Sony headphones
   *
   * Current user just RIGHT-swiped:
   *   Other user's AirPods
   *
   * => these two listings form a match.
   */
  const reciprocalSwipes =
    await prisma.swipe.findMany({
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
    listingId: theirLikedListingId,
  } of reciprocalSwipes) {
    /*
     * Avoid accidentally matching a listing with itself.
     */
    if (theirLikedListingId === listing.id) {
      continue;
    }

    const reciprocalListing =
      await prisma.listing.findUnique({
        where: {
          id: theirLikedListingId,
        },
        select: {
          id: true,
          ownerId: true,
          status: true,
        },
      });

    /*
     * The reciprocal listing must still exist,
     * belong to the swiper, and remain active.
     */
    if (
      !reciprocalListing ||
      reciprocalListing.ownerId !== swiperUserId ||
      reciprocalListing.status !== "ACTIVE"
    ) {
      continue;
    }

    const pair = canonicalPair(
      listing.id,
      listing.ownerId,
      reciprocalListing.id,
      swiperUserId
    );

    try {
      /*
       * The database unique constraint on the match pair
       * prevents duplicate matches.
       */
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
       * P2002 means the same listing pair already matched.
       *
       * This is safe to ignore because the desired state
       * already exists.
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