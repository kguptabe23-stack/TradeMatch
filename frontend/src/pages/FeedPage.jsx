import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  apiFetch,
  getCompatibleListings,
} from "../api/client";

import { useAuth } from "../auth/AuthContext";

import SwipeCard from "../components/SwipeCard";
import MatchOverlay from "../components/MatchOverlay";
import BrandMark from "../components/BrandMark";

function EmptyPanel({ title, subtitle, action }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2.5 px-8 text-center">
      <div className="font-poppins font-bold text-lg text-[#121212]">
        {title}
      </div>

      {subtitle && (
        <div className="text-sm text-[#777]">
          {subtitle}
        </div>
      )}

      {action}
    </div>
  );
}

const CONDITIONS = [
  { value: "", label: "All conditions" },
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
];

const CATEGORIES = [
  "Electronics",
  "Books",
  "Clothing",
  "Sports",
  "Home",
  "Gaming",
  "Accessories",
  "Other",
];

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading");
  const [listings, setListings] = useState([]);

  const [compatibilityMap, setCompatibilityMap] = useState({});

  const [index, setIndex] = useState(0);

  const [match, setMatch] = useState(null);

  const cardRef = useRef(null);

  /*
   * Filters
   */
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("newest");

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    setStatus("loading");

    try {
      const feedData = await apiFetch("/api/swipes/feed");

      const feedListings = feedData.listings || [];

      setListings(feedListings);
      setIndex(0);

      const mineData = await apiFetch("/api/listings/mine");

      const myListing = (mineData.listings || []).find(
        (item) => item.status === "ACTIVE"
      );

      if (myListing) {
        const compatibilityData =
          await getCompatibleListings(myListing.id);

        const map = {};

        for (const item of compatibilityData.results || []) {
          map[item.id] = item.compatibility;
        }

        setCompatibilityMap(map);
      } else {
        setCompatibilityMap({});
      }

      setStatus("ready");
    } catch (err) {
      setStatus(err.status === 403 ? "gated" : "error");
    }
  }

  /*
   * Apply filters to the swipe feed.
   */
  const filteredListings = useMemo(() => {
    let result = [...listings];

    const normalizedSearch = search.trim().toLowerCase();
    const normalizedTag = tag.trim().toLowerCase();

    if (normalizedSearch) {
      result = result.filter((listing) => {
        const title = String(listing.title || "").toLowerCase();
        const description = String(
          listing.description || ""
        ).toLowerCase();

        return (
          title.includes(normalizedSearch) ||
          description.includes(normalizedSearch)
        );
      });
    }

    if (category) {
      result = result.filter(
        (listing) =>
          String(listing.category || "").toLowerCase() ===
          category.toLowerCase()
      );
    }

    if (condition) {
      result = result.filter(
        (listing) =>
          String(listing.condition || "").toUpperCase() ===
          condition
      );
    }

    if (normalizedTag) {
      result = result.filter((listing) =>
        (listing.tags || []).some(
          (item) =>
            String(item).toLowerCase() === normalizedTag
        )
      );
    }

    if (sort === "compatibility") {
      result.sort((a, b) => {
        const scoreA =
          compatibilityMap[a.id]?.score ?? -1;

        const scoreB =
          compatibilityMap[b.id]?.score ?? -1;

        return scoreB - scoreA;
      });
    } else {
      result.sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );
    }

    return result;
  }, [
    listings,
    search,
    category,
    condition,
    tag,
    sort,
    compatibilityMap,
  ]);

  /*
   * When filters change, restart the feed at the
   * first filtered listing.
   */
  useEffect(() => {
    setIndex(0);
  }, [search, category, condition, tag, sort]);

  function clearFilters() {
    setSearch("");
    setCategory("");
    setCondition("");
    setTag("");
    setSort("newest");
  }

  const hasFilters =
    search.trim() ||
    category ||
    condition ||
    tag ||
    sort !== "newest";

  async function recordSwipe(direction) {
    const listing = filteredListings[index];

    if (!listing) {
      return;
    }

    try {
      const data = await apiFetch("/api/swipes", {
        method: "POST",
        body: JSON.stringify({
          listingId: listing.id,
          direction,
        }),
      });

      if (
        direction === "RIGHT" &&
        data.matches?.length > 0
      ) {
        setMatch(data.matches[0]);

        return;
      }
    } catch {
      // Card has already animated away.
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

  const listing = filteredListings[index];

  const nextListing = filteredListings[index + 1];

  const matchIsUserA =
    match && match.userAId === user?.id;

  const myListing =
    match &&
    (matchIsUserA
      ? match.listingA
      : match.listingB);

  const theirListing =
    match &&
    (matchIsUserA
      ? match.listingB
      : match.listingA);

  const theirOwner =
    match &&
    (matchIsUserA
      ? match.userB
      : match.userA);

  const currentCompatibility =
    listing
      ? compatibilityMap[listing.id]
      : null;

  return (
    <>
      {/* Header */}
      <div className="h-14 shrink-0 flex items-center justify-between px-4.5 border-b border-[#EEE]">
        <BrandMark
          size={26}
          textClassName="text-[17px]"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((value) => !value)}
            className={`h-8 px-3 rounded-full border text-[11px] font-bold cursor-pointer ${
              showFilters || hasFilters
                ? "border-brand-teal text-brand-teal bg-[#E8F7F4]"
                : "border-[#E5E5E5] text-[#555] bg-white"
            }`}
          >
            ⚙ Filters
          </button>

          <span className="text-[11px] font-semibold text-brand-teal border-[1.5px] border-brand-teal/40 rounded-full px-2.5 py-0.75">
            Feed
          </span>
        </div>
      </div>

      {/* Filter panel */}
      {status === "ready" && showFilters && (
        <div className="shrink-0 px-4 py-3 border-b border-[#EEE] bg-[#FAFAFA]">

          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings…"
            className="w-full h-10 rounded-full border-[1.5px] border-[#E2E2E2] bg-white px-4 text-[13px] outline-none focus:border-brand-teal"
          />

          <div className="grid grid-cols-2 gap-2 mt-2">

            {/* Category */}
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              className="h-10 rounded-full border-[1.5px] border-[#E2E2E2] bg-white px-3 text-[12px] outline-none focus:border-brand-teal"
            >
              <option value="">All categories</option>

              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            {/* Condition */}
            <select
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value)
              }
              className="h-10 rounded-full border-[1.5px] border-[#E2E2E2] bg-white px-3 text-[12px] outline-none focus:border-brand-teal"
            >
              {CONDITIONS.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tag */}
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Filter by tag, e.g. headphones"
            className="w-full h-10 mt-2 rounded-full border-[1.5px] border-[#E2E2E2] bg-white px-4 text-[12px] outline-none focus:border-brand-teal"
          />

          {/* Sort */}
          <div className="flex items-center gap-2 mt-2">

            <select
              value={sort}
              onChange={(e) =>
                setSort(e.target.value)
              }
              className="flex-1 h-10 rounded-full border-[1.5px] border-[#E2E2E2] bg-white px-3 text-[12px] outline-none focus:border-brand-teal"
            >
              <option value="newest">
                Newest listings
              </option>

              <option value="compatibility">
                Best compatibility
              </option>
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="h-10 px-4 rounded-full border border-[#E2E2E2] bg-white text-[#666] text-[12px] font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">
          Loading…
        </div>
      )}

      {status === "error" && (
        <EmptyPanel
          title="Something went wrong"
          action={
            <button
              onClick={loadFeed}
              className="text-sm text-brand-teal underline cursor-pointer"
            >
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
              onClick={() =>
                navigate("/listings/new?gate=1")
              }
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
                transform:
                  "scale(0.95) translateY(8px) rotate(2deg)",
              }}
            />
          )}

          {listing ? (
            <div
              className="absolute"
              style={{
                inset: "16px 18px 84px 18px",
              }}
            >
              <SwipeCard
                key={listing.id}
                ref={cardRef}
                listing={listing}
                compatibility={currentCompatibility}
                draggable
                onSwipeComplete={recordSwipe}
              />
            </div>
          ) : (
            <div
              className="absolute rounded-4xl bg-[#F5F5F5] flex flex-col items-center justify-center gap-2 px-8 text-center"
              style={{
                inset: "16px 18px 84px 18px",
              }}
            >
              <div className="font-poppins font-bold text-lg text-[#121212]">
                {hasFilters
                  ? "No listings match your filters"
                  : "No more listings right now"}
              </div>

              <div className="text-sm text-[#777]">
                {hasFilters
                  ? "Try changing or clearing your filters."
                  : "Check back later for more to trade."}
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="h-10 px-5 rounded-full bg-brand-teal text-white font-bold text-[12px] mt-1 cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Swipe buttons */}
          {listing && (
            <div className="absolute left-0 right-0 bottom-3.5 flex justify-center gap-7">

              {/* PASS */}
              <button
                onClick={() =>
                  cardRef.current?.swipeLeft()
                }
                className="w-13.5 h-13.5 rounded-full border-2 border-brand-teal bg-white flex items-center justify-center cursor-pointer"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M4 4L20 20M20 4L4 20"
                    stroke="#00A896"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {/* TRADE */}
              <button
                onClick={() =>
                  cardRef.current?.swipeRight()
                }
                className="w-13.5 h-13.5 rounded-full bg-brand-coral flex items-center justify-center cursor-pointer shadow-[0_6px_16px_rgba(255,111,89,0.4)]"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 21s-7-4.35-9.5-8.5C.8 9 2 5 6 4.3c2-.35 3.7.6 4.9 2.3.9-1.7 2.9-2.65 4.9-2.3 4 .7 5.2 4.7 3.5 8.2C19 16.65 12 21 12 21z"
                    fill="white"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Match overlay */}
          {match && (
            <MatchOverlay
              myListing={myListing}
              theirListing={theirListing}
              theirOwnerName={theirOwner?.name}
              compatibility={
                compatibilityMap[theirListing?.id]
              }
              onSayHi={sayHi}
              onKeepBrowsing={keepBrowsing}
            />
          )}
        </div>
      )}
    </>
  );
}