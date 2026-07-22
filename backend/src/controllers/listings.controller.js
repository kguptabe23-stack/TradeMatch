const prisma = require("../lib/prisma");

const OWNER_SELECT = { id: true, name: true };
const MAX_PHOTOS = 9; // matches Tinder's own cap

// Shared by create/update. Returns an error string, or null if valid.
function validateImageUrls(imageUrls) {
  if (!Array.isArray(imageUrls) || !imageUrls.every((u) => typeof u === "string")) {
    return "imageUrls must be an array of strings";
  }
  if (imageUrls.length === 0) {
    return "at least one photo is required";
  }
  if (imageUrls.length > MAX_PHOTOS) {
    return `at most ${MAX_PHOTOS} photos are allowed`;
  }
  return null;
}

async function create(req, res) {
  const { title, description, imageUrls, wantedTags } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: "title and description are required" });
  }
  const imageError = validateImageUrls(imageUrls);
  if (imageError) {
    return res.status(400).json({ error: imageError });
  }
  if (wantedTags !== undefined && !Array.isArray(wantedTags)) {
    return res.status(400).json({ error: "wantedTags must be an array of strings" });
  }

  const listing = await prisma.listing.create({
    data: {
      title,
      description,
      imageUrls,
      wantedTags: wantedTags || [],
      ownerId: req.userId,
    },
  });

  return res.status(201).json({ listing });
}

// Public feed of listings anyone can trade for. Capped with `take` so a
// growing table can't turn this into an unbounded, slow query.
async function list(req, res) {
  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { owner: { select: OWNER_SELECT } },
  });

  return res.status(200).json({ listings });
}

async function getMine(req, res) {
  const listings = await prisma.listing.findMany({
    where: { ownerId: req.userId },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({ listings });
}

async function getOne(req, res) {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: { owner: { select: OWNER_SELECT } },
  });

  if (!listing) {
    return res.status(404).json({ error: "listing not found" });
  }

  return res.status(200).json({ listing });
}

// Shared by update/remove: load the listing and make sure the caller owns
// it. Returning 404 (not 403) when the listing doesn't exist keeps us from
// confirming to an attacker whether a given id exists at all.
async function loadOwnedListing(req, res) {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });

  if (!listing) {
    res.status(404).json({ error: "listing not found" });
    return null;
  }
  if (listing.ownerId !== req.userId) {
    res.status(403).json({ error: "you do not own this listing" });
    return null;
  }
  return listing;
}

async function update(req, res) {
  const listing = await loadOwnedListing(req, res);
  if (!listing) return;

  const { title, description, imageUrls, wantedTags, status } = req.body;

  if (imageUrls !== undefined) {
    const imageError = validateImageUrls(imageUrls);
    if (imageError) {
      return res.status(400).json({ error: imageError });
    }
  }
  if (wantedTags !== undefined && !Array.isArray(wantedTags)) {
    return res.status(400).json({ error: "wantedTags must be an array of strings" });
  }
  if (status !== undefined && !["ACTIVE", "ARCHIVED"].includes(status)) {
    return res.status(400).json({ error: "status must be ACTIVE or ARCHIVED" });
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(imageUrls !== undefined && { imageUrls }),
      ...(wantedTags !== undefined && { wantedTags }),
      ...(status !== undefined && { status }),
    },
  });

  return res.status(200).json({ listing: updated });
}

async function remove(req, res) {
  const listing = await loadOwnedListing(req, res);
  if (!listing) return;

  await prisma.listing.delete({ where: { id: listing.id } });

  return res.status(204).send();
}

module.exports = { create, list, getMine, getOne, update, remove };
