const { Router } = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireMatchParticipant } = require("../middleware/requireMatchParticipant");
const { asyncHandler } = require("../middleware/asyncHandler");
const { list } = require("../controllers/matches.controller");
const messages = require("../controllers/messages.controller");

const router = Router();

router.get("/", requireAuth, asyncHandler(list));

router.get("/:matchId/messages", requireAuth, requireMatchParticipant, asyncHandler(messages.list));
router.post("/:matchId/messages", requireAuth, requireMatchParticipant, asyncHandler(messages.create));

module.exports = router;
