const { Router } = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../middleware/asyncHandler");
const { uploadImage } = require("../controllers/uploads.controller");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — matches Tinder's own per-photo cap
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
});

const router = Router();

router.post(
  "/image",
  requireAuth,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "image must be under 10MB" });
      }
      next(err);
    });
  },
  asyncHandler(uploadImage)
);

module.exports = router;
