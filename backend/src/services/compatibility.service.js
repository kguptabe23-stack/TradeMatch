function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function normalizeArray(values) {
  return (values || [])
    .map(normalize)
    .filter(Boolean);
}

function calculateOverlapScore(offersA, wantsB, offersB, wantsA) {
  const aOffers = new Set(normalizeArray(offersA));
  const bOffers = new Set(normalizeArray(offersB));
  const aWants = new Set(normalizeArray(wantsA));
  const bWants = new Set(normalizeArray(wantsB));

  let matches = 0;
  let possible = 0;

  for (const tag of bWants) {
    possible++;

    if (aOffers.has(tag)) {
      matches++;
    }
  }

  for (const tag of aWants) {
    possible++;

    if (bOffers.has(tag)) {
      matches++;
    }
  }

  if (possible === 0) {
    return 0;
  }

  return matches / possible;
}

function calculateCategoryScore(categoryA, categoryB) {
  return normalize(categoryA) === normalize(categoryB) ? 1 : 0;
}

function conditionValue(condition) {
  const values = {
    NEW: 4,
    LIKE_NEW: 3,
    GOOD: 2,
    FAIR: 1,
  };

  return values[condition] || 0;
}

function calculateConditionScore(conditionA, conditionB) {
  const a = conditionValue(normalize(conditionA).toUpperCase());
  const b = conditionValue(normalize(conditionB).toUpperCase());

  if (!a || !b) {
    return 0;
  }

  const difference = Math.abs(a - b);

  return Math.max(0, 1 - difference / 3);
}

function calculateTextScore(listingA, listingB) {
  const textA = normalize(
    `${listingA.title || ""} ${listingA.description || ""}`
  );

  const textB = normalize(
    `${listingB.title || ""} ${listingB.description || ""}`
  );

  const wordsA = new Set(
    textA
      .split(/\s+/)
      .map(word => word.replace(/[^a-z0-9]/g, ""))
      .filter(word => word.length > 2)
  );

  const wordsB = new Set(
    textB
      .split(/\s+/)
      .map(word => word.replace(/[^a-z0-9]/g, ""))
      .filter(word => word.length > 2)
  );

  if (wordsA.size === 0 || wordsB.size === 0) {
    return 0;
  }

  let common = 0;

  for (const word of wordsA) {
    if (wordsB.has(word)) {
      common++;
    }
  }

  const union = new Set([...wordsA, ...wordsB]).size;

  return union === 0 ? 0 : common / union;
}

function calculateCompatibility(listingA, listingB) {
  const tagScore = calculateOverlapScore(
    listingA.tags,
    listingB.wantedTags,
    listingB.tags,
    listingA.wantedTags
  );

  const categoryScore = calculateCategoryScore(
    listingA.category,
    listingB.category
  );

  const conditionScore = calculateConditionScore(
    listingA.condition,
    listingB.condition
  );

  const textScore = calculateTextScore(
    listingA,
    listingB
  );

  const score =
    tagScore * 40 +
    categoryScore * 30 +
    textScore * 20 +
    conditionScore * 10;

  return {
    score: Math.round(score),

    breakdown: {
      tags: Math.round(tagScore * 40),
      category: Math.round(categoryScore * 30),
      description: Math.round(textScore * 20),
      condition: Math.round(conditionScore * 10),
    },
  };
}

module.exports = {
  calculateCompatibility,
};