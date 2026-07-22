const { Router } = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireHasListing } = require("../middleware/requireHasListing");
const { asyncHandler } = require("../middleware/asyncHandler");
const { feed, create } = require("../controllers/swipes.controller");

const router = Router();

router.get("/feed", requireAuth, requireHasListing, asyncHandler(feed));
router.post("/", requireAuth, requireHasListing, asyncHandler(create));

module.exports = router;
