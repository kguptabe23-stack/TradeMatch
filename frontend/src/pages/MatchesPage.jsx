import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getCompatibleListings } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const STRIPE_GRAY =
  "repeating-linear-gradient(135deg, #D8D8D8 0 8px, #E4E4E4 8px 16px)";
const STRIPE_TEAL =
  "repeating-linear-gradient(135deg, #CFEFEB 0 8px, #E0F5F2 8px 16px)";

export default function MatchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState(null);
  const [compatibilityMap, setCompatibilityMap] = useState({});

  useEffect(() => {
    async function loadMatches() {
      try {
        const data = await apiFetch("/api/matches");
        const matchList = data.matches || [];

        setMatches(matchList);

        // Calculate compatibility for each match
        const results = await Promise.all(
          matchList.map(async (match) => {
            try {
              const isUserA = match.userAId === user.id;
              const myListing = isUserA
                ? match.listingA
                : match.listingB;
              const theirListing = isUserA
                ? match.listingB
                : match.listingA;

              if (!myListing?.id || !theirListing?.id) {
                return null;
              }

              const data = await getCompatibleListings(myListing.id);

              const compatible = data.results?.find(
                (listing) => listing.id === theirListing.id
              );

              if (!compatible) {
                return null;
              }

              return {
                matchId: match.id,
                compatibility: compatible.compatibility,
              };
            } catch (error) {
              console.error(
                "Failed to load compatibility for match:",
                match.id,
                error
              );
              return null;
            }
          })
        );

        const map = {};

        results.forEach((result) => {
          if (result) {
            map[result.matchId] = result.compatibility;
          }
        });

        setCompatibilityMap(map);
      } catch (error) {
        console.error("Failed to load matches:", error);
        setMatches([]);
      }
    }

    if (user?.id) {
      loadMatches();
    }
  }, [user?.id]);

  if (matches === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-14 shrink-0 flex items-center justify-center border-b border-[#EEE]">
        <span className="font-poppins font-bold text-[17px] text-[#121212]">
          Matches
        </span>
      </div>

      {matches.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2.5 px-8 text-center">
          <div className="font-poppins font-bold text-[17px] text-[#121212]">
            No matches yet
          </div>

          <div className="text-sm text-[#777]">
            Keep swiping — mutual interest starts the trade.
          </div>

          <button
            onClick={() => navigate("/feed")}
            className="h-[42px] px-5 rounded-full border-[1.5px] border-brand-teal bg-white text-brand-teal font-bold text-[13px] mt-1.5 cursor-pointer"
          >
            Go to Feed
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto py-1">
          {matches.map((m) => {
            const isUserA = m.userAId === user.id;

            const myListing = isUserA ? m.listingA : m.listingB;
            const theirListing = isUserA ? m.listingB : m.listingA;
            const theirOwner = isUserA ? m.userB : m.userA;

            const latest = m.messages?.[0];

            // No read-receipt tracking currently exists.
            // Treat latest incoming message as unread.
            const unread =
              !!latest && latest.senderId !== user.id;

            const myCover = myListing?.imageUrls?.[0];
            const theirCover = theirListing?.imageUrls?.[0];

            const compatibility = compatibilityMap[m.id];
            const score = compatibility?.score;

            return (
              <div
                key={m.id}
                onClick={() => navigate(`/matches/${m.id}`)}
                className="flex items-center gap-3 px-[18px] py-3 cursor-pointer border-b border-[#F2F2F2]"
              >
                {/* Listing thumbnails */}
                <div className="relative w-[52px] h-11 flex-none">
                  <div
                    className="absolute left-0 top-0 w-9 h-9 rounded-[10px] border-2 border-white shadow-sm overflow-hidden"
                    style={
                      !myCover
                        ? { backgroundImage: STRIPE_GRAY }
                        : undefined
                    }
                  >
                    {myCover && (
                      <img
                        src={myCover}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div
                    className="absolute left-4 top-2 w-9 h-9 rounded-[10px] border-2 border-white shadow-sm overflow-hidden"
                    style={
                      !theirCover
                        ? { backgroundImage: STRIPE_TEAL }
                        : undefined
                    }
                  >
                    {theirCover && (
                      <img
                        src={theirCover}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>

                {/* Match information */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[#121212]">
                    {theirOwner.name}
                  </div>

                  <div className="text-[12.5px] text-[#777] truncate">
                    {latest
                      ? latest.text
                      : "You matched — say hi"}
                  </div>

                  {/* Compatibility */}
                  {score !== undefined && (
                    <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-[#E8F7F4] border border-[#BDE7E1]">
                      <span className="text-[11px]">🎯</span>
                      <span className="text-[11px] font-bold text-brand-teal">
                        {score}% Trade Compatibility
                      </span>
                    </div>
                  )}
                </div>

                {/* Unread indicator */}
                {unread && (
                  <div className="w-[9px] h-[9px] rounded-full bg-brand-coral flex-none" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}