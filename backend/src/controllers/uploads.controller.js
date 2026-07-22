const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

// Server-side proxy upload: the browser sends the file to us, we forward it
// to ImageKit using Basic Auth with the private key. This only needs the
// private key (never exposed to the client) — no public key or URL
// endpoint required, unlike ImageKit's client-side signed-upload flow.
async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "an image file is required" });
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([req.file.buffer], { type: req.file.mimetype }),
    req.file.originalname
  );
  form.append("fileName", `${req.userId}-${Date.now()}-${req.file.originalname}`);
  form.append("useUniqueFileName", "true");

  const auth = Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString("base64");

  const ikRes = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: form,
  });

  if (!ikRes.ok) {
    const body = await ikRes.json().catch(() => ({}));
    return res.status(502).json({ error: body.message || "image upload failed" });
  }

  const data = await ikRes.json();
  return res.status(201).json({ url: data.url });
}

module.exports = { uploadImage };
