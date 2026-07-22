const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { signup, login, refresh, logout } = require("../controllers/auth.controller");

const router = Router();

router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));

module.exports = router;
