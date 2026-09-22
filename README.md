# 🔄 TradeMatch

### Intelligent Peer-to-Peer Barter Marketplace

TradeMatch is a full-stack peer-to-peer barter platform where users can list items they want to exchange, discover potential trades, swipe on listings, receive reciprocal matches, and communicate through an integrated chat system.

> **Live Demo:** https://tradematchapp.vercel.app  
> **Backend API:** https://tradematch-backend.onrender.com

---

## ✨ Features

### 🔐 Authentication
- User signup and login
- JWT-based access authentication
- Refresh-token authentication using HTTP-only cookies
- Protected API routes
- Secure logout and session invalidation

### 📦 Listing Management
- Create, edit and manage barter listings
- Listing title and description
- Categories and item conditions
- Tags and wanted tags
- Multiple image support
- Image upload through ImageKit

### 👆 Swipe-Based Discovery
- Browse available barter listings
- Swipe **RIGHT** to express interest
- Swipe **LEFT** to skip a listing
- Prevents duplicate swipes
- Automatically excludes the user's own listings

### 🤝 Reciprocal Matching
A match is created when two users express interest in each other's listings.

```text
User A
  │
  │ RIGHT swipe
  ▼
User B's Listing
  │
  │
  ▼
User B
  │
  │ RIGHT swipe
  ▼
User A's Listing
  │
  ▼
🎉 MATCH