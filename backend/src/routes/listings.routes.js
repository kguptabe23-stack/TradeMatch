const { Router } = require("express");

const { requireAuth } = require("../middleware/auth.middleware");

const { asyncHandler } = require("../middleware/asyncHandler");

const {
  create,
  list,
  getMine,
  getOne,
  update,
  remove,
} = require("../controllers/listings.controller");

const {
  getCompatibleListings,
} = require("../controllers/compatibility.controller");

const router = Router();

router.get("/", asyncHandler(list));

router.get("/mine", requireAuth, asyncHandler(getMine));

router.get(
  "/:id/compatibility",
  requireAuth,
  asyncHandler(getCompatibleListings)
);

router.get("/:id", asyncHandler(getOne));

router.post("/", requireAuth, asyncHandler(create));

router.patch("/:id", requireAuth, asyncHandler(update));

router.delete("/:id", requireAuth, asyncHandler(remove));

module.exports = router;