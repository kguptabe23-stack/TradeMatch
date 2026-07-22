const prisma = require("../lib/prisma");

async function list(req, res) {
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: req.userId }, { userBId: req.userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      listingA: true,
      listingB: true,
      userA: { select: { id: true, name: true } },
      userB: { select: { id: true, name: true } },
      // Just the newest message, for the Matches list preview — the full
      // thread is fetched separately when a chat is actually opened.
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return res.status(200).json({ matches });
}

module.exports = { list };
