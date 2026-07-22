const prisma = require("../lib/prisma");

const MAX_TEXT_LENGTH = 2000;

// The polling contract: the client passes `after` (an ISO timestamp of the
// newest message it already has) and gets back only what's new. First load
// omits `after` and gets the most recent history instead.
async function list(req, res) {
  const { after } = req.query;

  let createdAtFilter;
  if (after) {
    const afterDate = new Date(after);
    if (Number.isNaN(afterDate.getTime())) {
      return res.status(400).json({ error: "after must be a valid ISO date string" });
    }
    createdAtFilter = { gt: afterDate };
  }

  const messages = await prisma.message.findMany({
    where: {
      matchId: req.match.id,
      ...(createdAtFilter && { createdAt: createdAtFilter }),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return res.status(200).json({ messages });
}

async function create(req, res) {
  const { text } = req.body;

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "text is required" });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `text must be under ${MAX_TEXT_LENGTH} characters` });
  }

  const message = await prisma.message.create({
    data: {
      matchId: req.match.id,
      senderId: req.userId,
      text: text.trim(),
    },
  });

  return res.status(201).json({ message });
}

module.exports = { list, create };
