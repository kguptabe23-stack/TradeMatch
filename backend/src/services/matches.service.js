const prisma = require("../lib/prisma");

// Sort the pair so the same two listings always resolve to the same A/B
// slots no matter which side's swipe triggered the check.
function canonicalPair(listingId1, ownerId1, listingId2, ownerId2) {
  if (listingId1 < listingId2) {
    return { listingAId: listingId1, userAId: ownerId1, listingBId: listingId2, userBId: ownerId2 };
  }
  return { listingAId: listingId2, userAId: ownerId2, listingBId: listingId1, userBId: ownerId1 };
}

// Call this after recording a RIGHT swipe. A match is a specific pair of
// listings, not a pair of users — S liking O's listing only completes a
// match for the specific listing(s) of S's that O already liked back.
async function detectMatches({ swiperUserId, listing }) {
  const reciprocalSwipes = await prisma.swipe.findMany({
    where: {
      swiperUserId: listing.ownerId,
      direction: "RIGHT",
      listing: { ownerId: swiperUserId },
    },
    select: { listingId: true },
  });

  const createdMatches = [];

  for (const { listingId: theirLikedListingId } of reciprocalSwipes) {
    const pair = canonicalPair(
      listing.id,
      listing.ownerId,
      theirLikedListingId,
      swiperUserId
    );

    try {
      // Included so the caller (the match-celebration UI) has everything
      // it needs to render without a second round trip.
      const match = await prisma.match.create({
        data: pair,
        include: {
          listingA: true,
          listingB: true,
          userA: { select: { id: true, name: true } },
          userB: { select: { id: true, name: true } },
        },
      });
      createdMatches.push(match);
    } catch (err) {
      if (err.code !== "P2002") throw err; // pair already matched, ignore
    }
  }

  return createdMatches;
}

module.exports = { detectMatches };
