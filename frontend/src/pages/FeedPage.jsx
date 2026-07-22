import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import SwipeCard from "../components/SwipeCard";
import MatchOverlay from "../components/MatchOverlay";
import BrandMark from "../components/BrandMark";

function EmptyPanel({ title, subtitle, action }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2.5 px-8 text-center">
      <div className="font-poppins font-bold text-lg text-[#121212]">{title}</div>
      {subtitle && <div className="text-sm text-[#777]">{subtitle}</div>}
      {action}
    </div>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | ready | gated | error
  const [listings, setListings] = useState([]);
  const [index, setIndex] = useState(0);
  const [match, setMatch] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    setStatus("loading");
    try {
      const data = await apiFetch("/api/swipes/feed");
      setListings(data.listings);
      setIndex(0);
      setStatus("ready");
    } catch (err) {
      setStatus(err.status === 403 ? "gated" : "error");
    }
  }

  async function recordSwipe(direction) {
    const listing = listings[index];
    try {
      const data = await apiFetch("/api/swipes", {
        method: "POST",
        body: JSON.stringify({ listingId: listing.id, direction }),
      });
      if (direction === "RIGHT" && data.matches?.length > 0) {
        setMatch(data.matches[0]);
        return; // hold on this index until the match overlay is dismissed
      }
    } catch {
      // the card has already animated away; nothing actionable to surface
    }
    setIndex((i) => i + 1);
  }

  function keepBrowsing() {
    setMatch(null);
    setIndex((i) => i + 1);
  }

  function sayHi() {
    const matchId = match.id;
    setMatch(null);
    navigate(`/matches/${matchId}`);
  }

  const listing = listings[index];
  const nextListing = listings[index + 1];

  const matchIsUserA = match && match.userAId === user?.id;
  const myListing = match && (matchIsUserA ? match.listingA : match.listingB);
  const theirListing = match && (matchIsUserA ? match.listingB : match.listingA);
  const theirOwner = match && (matchIsUserA ? match.userB : match.userA);

  return (
    <>
      <div className="h-14 shrink-0 flex items-center justify-between px-4.5 border-b border-[#EEE]">
        <BrandMark size={26} textClassName="text-[17px]" />
        <span className="text-[11px] font-semibold text-brand-teal border-[1.5px] border-brand-teal/40 rounded-full px-2.5 py-0.75">
          Feed
        </span>
      </div>

      {status === "loading" && (
        <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">Loading…</div>
      )}

      {status === "error" && (
        <EmptyPanel
          title="Something went wrong"
          action={
            <button onClick={loadFeed} className="text-sm text-brand-teal underline cursor-pointer">
              Try again
            </button>
          }
        />
      )}

      {status === "gated" && (
        <EmptyPanel
          title="List something to start browsing"
          subtitle="You'll need one active listing before you can swipe on others."
          action={
            <button
              onClick={() => navigate("/listings/new?gate=1")}
              className="h-11 px-5.5 rounded-full bg-brand-coral text-white font-bold text-[13px] mt-1.5 cursor-pointer"
            >
              List an item
            </button>
          }
        />
      )}

      {status === "ready" && (
        <div className="flex-1 relative px-4.5 py-4 min-h-0">
          {nextListing && (
            <div
              className="absolute rounded-4xl bg-[#F0F0F0]"
              style={{
                inset: "22px 26px 84px 26px",
                transform: "scale(0.95) translateY(8px) rotate(2deg)",
              }}
            />
          )}

          {listing ? (
            <div className="absolute" style={{ inset: "16px 18px 84px 18px" }}>
              <SwipeCard key={listing.id} ref={cardRef} listing={listing} draggable onSwipeComplete={recordSwipe} />
            </div>
          ) : (
            <div
              className="absolute rounded-4xl bg-[#F5F5F5] flex flex-col items-center justify-center gap-2 px-8 text-center"
              style={{ inset: "16px 18px 84px 18px" }}
            >
              <div className="font-poppins font-bold text-lg text-[#121212]">No more listings right now</div>
              <div className="text-sm text-[#777]">Check back later for more to trade.</div>
            </div>
          )}

          {listing && (
            <div className="absolute left-0 right-0 bottom-3.5 flex justify-center gap-7">
              <button
                onClick={() => cardRef.current?.swipeLeft()}
                className="w-13.5 h-13.5 rounded-full border-2 border-brand-teal bg-white flex items-center justify-center cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M4 4L20 20M20 4L4 20" stroke="#00A896" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
              <button
                onClick={() => cardRef.current?.swipeRight()}
                className="w-13.5 h-13.5 rounded-full bg-brand-coral flex items-center justify-center cursor-pointer shadow-[0_6px_16px_rgba(255,111,89,0.4)]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path
                    d="M12 21s-7-4.35-9.5-8.5C.8 9 2 5 6 4.3c2-.35 3.7.6 4.9 2.3.9-1.7 2.9-2.65 4.9-2.3 4 .7 5.2 4.7 3.5 8.2C19 16.65 12 21 12 21z"
                    fill="white"
                  />
                </svg>
              </button>
            </div>
          )}

          {match && (
            <MatchOverlay
              myListing={myListing}
              theirListing={theirListing}
              theirOwnerName={theirOwner?.name}
              onSayHi={sayHi}
              onKeepBrowsing={keepBrowsing}
            />
          )}
        </div>
      )}
    </>
  );
}
