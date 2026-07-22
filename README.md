# Barter 🔄

A Tinder-style swipe app for bartering used items. No money, no buying or selling—just direct item-for-item trades. Users upload items they want to get rid of, swipe on things they want, and if there's a mutual match, they get put into a chat to negotiate the swap.

## Tech Stack

*   **Frontend:** React (Vite) + CSS/Tailwind
*   **Backend:** Node.js, Express
*   **Database:** PostgreSQL, Prisma ORM
*   **Authentication:** Custom JWT (Access + Refresh tokens), bcrypt
*   **Image Storage:** ImageKit

## MVP Features

*   **Secure Auth:** JWT-based login/signup flow.
*   **Listing Management:** Full CRUD for user items, including image uploads and "wanted" tags.
*   **Swipe Engine:** Tinder-style right/left swiping on the feed.
*   **Match Detection:** System automatically detects mutual right-swipes and creates a Match instance.
*   **Chat:** Match-specific messaging (currently using short-polling) to coordinate the actual trade.

## Database Schema Model

For a quick overview of how the data is structured:
*   `User`: Authentication and profile details.
*   `Listing`: The item being traded (belongs to a User, contains image URLs and status).
*   `Swipe`: Records a user's swipe direction on a specific listing.
*   `Match`: Generated when User A swipes right on Listing B, and User B swipes right on Listing A.
*   `Message`: Chat messages tied to a specific Match.
