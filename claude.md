# Barter — Project Context

## What this is
A Tinder-style swipe app for bartering used items (no money — direct trade).
Users list an item, swipe on others' listings, mutual right-swipes create a
match, matched users chat to negotiate the trade.

## Stack
- Frontend: React (Vite), plain CSS or Tailwind
- Backend: Node + Express
- DB: PostgreSQL + Prisma
- Auth: JWT (access + refresh token), bcrypt for passwords
- Chat: simple polling (fetch new messages every few sec) — NOT websockets for now
- Image upload: imagekit free tier

## Data model
User: id, name, email, passwordHash, createdAt
Listing: id, ownerId, title, description, imageUrl, wantedTags[], status, createdAt
Swipe: id, swiperUserId, listingId, direction, createdAt (unique on swiperUserId+listingId)
Match: id, listingAId, listingBId, userAId, userBId, createdAt
Message: id, matchId, senderId, text, createdAt

## Build order (do NOT skip ahead)
1. Auth (signup/login/JWT) — fully working before anything else
2. Listing CRUD
3. Swipe feed + recording swipes (no match logic yet)
4. Mutual-match detection
5. Chat (polling)
6. Frontend polish
7. Deploy

## Rules
- I'm learning as we build this — after any non-trivial change, briefly
  explain WHAT you did and WHY, don't just silently write code.
- Don't add features I haven't asked for yet (no websockets, no location
  radius, no ratings, no multi-way barter matching) until I explicitly say so.
- Keep commits small and working — I want to test after every step.