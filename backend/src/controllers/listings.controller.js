const prisma = require("../lib/prisma");

const OWNER_SELECT = { id: true, name: true };
const MAX_PHOTOS = 9;

const VALID_CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR"];
const VALID_STATUSES = ["ACTIVE", "ARCHIVED"];

// Shared by create/update. Returns an error string, or null if valid.
function validateImageUrls(imageUrls) {
  if (
    !Array.isArray(imageUrls) ||
    !imageUrls.every((u) => typeof u === "string")
  ) {
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
  const {
    title,
    description,
    category,
    condition,
    tags,
    imageUrls,
    wantedTags,
  } = req.body;

  if (!title || !description) {
    return res
      .status(400)
      .json({ error: "title and description are required" });
  }

  if (!category || typeof category !== "string") {
    return res.status(400).json({ error: "category is required" });
  }

  if (!condition || typeof condition !== "string") {
    return res.status(400).json({ error: "condition is required" });
  }

  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
    return res
      .status(400)
      .json({ error: "tags must be an array of strings" });
  }

  const imageError = validateImageUrls(imageUrls);

  if (imageError) {
    return res.status(400).json({ error: imageError });
  }

  if (
    wantedTags !== undefined &&
    (!Array.isArray(wantedTags) ||
      !wantedTags.every((tag) => typeof tag === "string"))
  ) {
    return res
      .status(400)
      .json({ error: "wantedTags must be an array of strings" });
  }

  const listing = await prisma.listing.create({
    data: {
      title,
      description,
      category,
      condition,
      tags,
      imageUrls,
      wantedTags: wantedTags || [],
      ownerId: req.userId,
    },
  });

  return res.status(201).json({ listing });
}

/*
 * Public listing feed.
 *
 * Supported query parameters:
 *
 * ?search=sony
 * ?category=Electronics
 * ?condition=LIKE_NEW
 * ?tag=headphones
 * ?sort=newest
 * ?sort=oldest
 *
 * Examples:
 * /api/listings?search=sony
 * /api/listings?category=Electronics
 * /api/listings?condition=LIKE_NEW
 * /api/listings?tag=headphones
 * /api/listings?search=airpods&category=Electronics&condition=LIKE_NEW
 */
async function list(req, res) {
  const {
    search,
    category,
    condition,
    tag,
    sort = "newest",
  } = req.query;

  const where = {
    status: "ACTIVE",
  };

  /*
   * Search title + description.
   *
   * mode: "insensitive" makes:
   * Sony = sony = SONY
   */
  if (search && typeof search === "string") {
    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      where.OR = [
        {
          title: {
            contains: trimmedSearch,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: trimmedSearch,
            mode: "insensitive",
          },
        },
      ];
    }
  }

  /*
   * Category filter.
   */
  if (category && typeof category === "string") {
    where.category = {
      equals: category.trim(),
      mode: "insensitive",
    };
  }

  /*
   * Condition filter.
   */
  if (condition && typeof condition === "string") {
    const normalizedCondition = condition.trim().toUpperCase();

    if (!VALID_CONDITIONS.includes(normalizedCondition)) {
      return res.status(400).json({
        error: `condition must be one of: ${VALID_CONDITIONS.join(", ")}`,
      });
    }

    where.condition = normalizedCondition;
  }

  /*
   * Tag filter.
   *
   * PostgreSQL array "has" checks whether the listing's
   * tags array contains the requested tag.
   */
  if (tag && typeof tag === "string") {
    const trimmedTag = tag.trim().toLowerCase();

    if (trimmedTag) {
      where.tags = {
        has: trimmedTag,
      };
    }
  }

  /*
   * Sorting.
   */
  let orderBy;

  switch (sort) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;

    case "newest":
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  const listings = await prisma.listing.findMany({
    where,
    orderBy,
    take: 50,
    include: {
      owner: {
        select: OWNER_SELECT,
      },
    },
  });

  return res.status(200).json({
    listings,
    filters: {
      search: search || "",
      category: category || "",
      condition: condition || "",
      tag: tag || "",
      sort,
    },
  });
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
    include: {
      owner: {
        select: OWNER_SELECT,
      },
    },
  });

  if (!listing) {
    return res.status(404).json({ error: "listing not found" });
  }

  return res.status(200).json({ listing });
}

// Shared by update/remove.
async function loadOwnedListing(req, res) {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
  });

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

  const {
    title,
    description,
    category,
    condition,
    tags,
    imageUrls,
    wantedTags,
    status,
  } = req.body;

  if (imageUrls !== undefined) {
    const imageError = validateImageUrls(imageUrls);

    if (imageError) {
      return res.status(400).json({ error: imageError });
    }
  }

  if (
    wantedTags !== undefined &&
    (!Array.isArray(wantedTags) ||
      !wantedTags.every((tag) => typeof tag === "string"))
  ) {
    return res
      .status(400)
      .json({ error: "wantedTags must be an array of strings" });
  }

  if (
    tags !== undefined &&
    (!Array.isArray(tags) ||
      !tags.every((tag) => typeof tag === "string"))
  ) {
    return res
      .status(400)
      .json({ error: "tags must be an array of strings" });
  }

  if (category !== undefined && typeof category !== "string") {
    return res.status(400).json({ error: "category must be a string" });
  }

  if (condition !== undefined && typeof condition !== "string") {
    return res.status(400).json({ error: "condition must be a string" });
  }

  if (
    status !== undefined &&
    !VALID_STATUSES.includes(status)
  ) {
    return res.status(400).json({
      error: "status must be ACTIVE or ARCHIVED",
    });
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(condition !== undefined && { condition }),
      ...(tags !== undefined && { tags }),
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

  await prisma.listing.delete({
    where: { id: listing.id },
  });

  return res.status(204).send();
}

module.exports = {
  create,
  list,
  getMine,
  getOne,
  update,
  remove,
};