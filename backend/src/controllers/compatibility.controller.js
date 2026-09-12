const prisma = require("../lib/prisma");
const {
  calculateCompatibility,
} = require("../services/compatibility.service");

async function getCompatibleListings(req, res) {
  const listingId = req.params.id;

  // Get the current user's listing
  const sourceListing = await prisma.listing.findUnique({
    where: {
      id: listingId,
    },
  });

  if (!sourceListing) {
    return res.status(404).json({
      error: "listing not found",
    });
  }

  // Get active listings owned by other users
  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      ownerId: {
        not: sourceListing.ownerId,
      },
      id: {
        not: sourceListing.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Calculate compatibility for every candidate
  const compatibleListings = listings.map((listing) => {
    const compatibility = calculateCompatibility(
      sourceListing,
      listing
    );

    return {
      ...listing,
      compatibility,
    };
  });

  // Highest compatibility first
  compatibleListings.sort(
    (a, b) => b.compatibility.score - a.compatibility.score
  );

  return res.status(200).json({
    listingId: sourceListing.id,
    results: compatibleListings,
  });
}

module.exports = {
  getCompatibleListings,
};