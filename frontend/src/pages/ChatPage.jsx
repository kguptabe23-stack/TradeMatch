import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getCompatibleListings } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const POLL_INTERVAL_MS = 3000;

function formatTime(iso) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m < 10 ? "0" : ""}${m} ${ap}`;
}

function ScorePill({ score }) {
  if (score === undefined || score === null) return null;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F7F4] border border-[#BDE7E1]">
      <span className="text-[10px]">🎯</span>
      <span className="text-[10.5px] font-bold text-brand-teal">
        {score}% compatible
      </span>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { matchId } = useParams();

  const [match, setMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [compatibility, setCompatibility] = useState(null);

  const [pending, setPending] = useState([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const listRef = useRef(null);
  const lastCreatedAtRef = useRef(null);

  /*
   * Load the match itself.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadMatch() {
      try {
        const data = await apiFetch("/api/matches");

        if (cancelled) return;

        const found = data.matches.find((m) => m.id === matchId);

        if (!found) {
          setError("Match not found.");
          return;
        }

        setMatch(found);
      } catch (err) {
        if (!cancelled) {
          setError("Unable to load this match.");
        }
      }
    }

    loadMatch();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  /*
   * Load messages.
   */
  const fetchMessages = useCallback(
    async (after) => {
      const query = after
        ? `?after=${encodeURIComponent(after)}`
        : "";

      const { messages } = await apiFetch(
        `/api/matches/${matchId}/messages${query}`
      );

      return messages;
    },
    [matchId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitialMessages() {
      try {
        const initial = await fetchMessages();

        if (cancelled) return;

        setMessages(initial);

        if (initial.length) {
          lastCreatedAtRef.current =
            initial[initial.length - 1].createdAt;
        }

        setLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setError("Unable to load messages.");
          setLoaded(true);
        }
      }
    }

    loadInitialMessages();

    return () => {
      cancelled = true;
    };
  }, [fetchMessages]);

  /*
   * Load compatibility once the match is available.
   */
  useEffect(() => {
    if (!match || !user?.id) return;

    let cancelled = false;

    async function loadCompatibility() {
      try {
        const isUserA = match.userAId === user.id;

        const myListing = isUserA
          ? match.listingA
          : match.listingB;

        const theirListing = isUserA
          ? match.listingB
          : match.listingA;

        if (!myListing?.id || !theirListing?.id) return;

        const data = await getCompatibleListings(myListing.id);

        const result = data.results?.find(
          (listing) => listing.id === theirListing.id
        );

        if (!cancelled && result?.compatibility) {
          setCompatibility(result.compatibility);
        }
      } catch (err) {
        console.error("Failed to load chat compatibility:", err);
      }
    }

    loadCompatibility();

    return () => {
      cancelled = true;
    };
  }, [match, user?.id]);

  /*
   * Short polling.
   *
   * Only request messages newer than the last known message.
   */
  useEffect(() => {
    if (!loaded) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await fetchMessages(lastCreatedAtRef.current);

        if (!fresh.length) return;

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const unique = fresh.filter(
            (message) => !existingIds.has(message.id)
          );

          return unique.length ? [...prev, ...unique] : prev;
        });

        lastCreatedAtRef.current =
          fresh[fresh.length - 1].createdAt;
      } catch (err) {
        // Don't interrupt the chat if one polling request fails.
        console.error("Message polling failed:", err);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchMessages, loaded]);

  /*
   * Keep the conversation scrolled to the newest message.
   */
  useEffect(() => {
    const element = listRef.current;

    if (!element) return;

    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  /*
   * Send a message.
   */
  async function send(text, localId) {
    try {
      const { message } = await apiFetch(
        `/api/matches/${matchId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ text }),
        }
      );

      setPending((current) =>
        current.filter((m) => m.localId !== localId)
      );

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }

        return [...prev, message];
      });

      lastCreatedAtRef.current = message.createdAt;
    } catch (err) {
      setPending((current) =>
        current.map((m) =>
          m.localId === localId
            ? { ...m, status: "failed" }
            : m
        )
      );
    }
  }

  function handleSend() {
    const text = draft.trim();

    if (!text) return;

    setDraft("");

    const localId =
      `local-${Date.now()}-${Math.random()}`;

    setPending((current) => [
      ...current,
      {
        localId,
        text,
        status: "sending",
      },
    ]);

    send(text, localId);
  }

  function retry(localId) {
    const item = pending.find(
      (message) => message.localId === localId
    );

    if (!item) return;

    setPending((current) =>
      current.map((message) =>
        message.localId === localId
          ? { ...message, status: "sending" }
          : message
      )
    );

    send(item.text, localId);
  }

  if (error && !match) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="font-poppins font-bold text-[17px] text-[#121212]">
          {error}
        </div>

        <button
          onClick={() => navigate("/matches")}
          className="h-[42px] px-5 rounded-full bg-brand-teal text-white font-bold text-[13px]"
        >
          Back to Matches
        </button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  const isUserA = match.userAId === user.id;

  const myListing = isUserA
    ? match.listingA
    : match.listingB;

  const theirListing = isUserA
    ? match.listingB
    : match.listingA;

  const theirOwner = isUserA
    ? match.userB
    : match.userA;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">

      {/* Header */}
      <div className="h-14 shrink-0 flex items-center gap-2.5 px-3.5 border-b border-[#EEE]">

        <button
          onClick={() => navigate("/matches")}
          aria-label="Back to matches"
          className="w-8 h-8 rounded-full border border-[#E5E5E5] bg-white flex items-center justify-center cursor-pointer flex-none"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
          >
            <path
              d="M15 4L7 12L15 20"
              stroke="#333"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="font-poppins font-bold text-[15px] text-[#121212] truncate">
            {theirOwner.name}
          </div>

          <div className="text-[10.5px] text-[#999] truncate">
            Trade conversation
          </div>
        </div>

        <ScorePill score={compatibility?.score} />
      </div>

      {/* Trade summary */}
      <div className="bg-[#E6F7F5] px-4 py-2.5 border-b border-[#D8EFEB]">

        <div className="text-[11px] font-bold text-[#00786D] mb-0.5">
          MATCHED TRADE
        </div>

        <div className="text-xs text-[#00786D] truncate">
          {theirListing.title} ↔ {myListing.title}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-auto p-4 flex flex-col gap-2.5"
      >

        {!loaded && (
          <div className="flex-1 flex items-center justify-center text-[#999] text-sm">
            Loading messages…
          </div>
        )}

        {loaded &&
          messages.length === 0 &&
          pending.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">

              <div className="text-3xl mb-2">
                💬
              </div>

              <div className="font-poppins font-bold text-[15px] text-[#222]">
                You matched with {theirOwner.name}
              </div>

              <div className="text-[12.5px] text-[#999] mt-1.5">
                Start the conversation and discuss the trade.
              </div>

            </div>
          )}

        {messages.map((msg) => {
          const mine = msg.senderId === user.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[78%] ${
                mine
                  ? "items-end self-end"
                  : "items-start self-start"
              }`}
            >
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-snug ${
                  mine
                    ? "bg-brand-teal text-white rounded-br-md"
                    : "bg-[#F0F0F0] text-[#222] rounded-bl-md"
                }`}
              >
                {msg.text}
              </div>

              <div className="text-[10.5px] text-[#AAA] mt-1 px-1">
                {formatTime(msg.createdAt)}
              </div>
            </div>
          );
        })}

        {/* Optimistic messages */}
        {pending.map((msg) => (
          <div
            key={msg.localId}
            className="flex flex-col max-w-[78%] items-end self-end"
          >
            <div className="px-3.5 py-2.5 rounded-2xl rounded-br-md text-[13.5px] leading-snug bg-brand-teal text-white opacity-90">
              {msg.text}
            </div>

            {msg.status === "sending" && (
              <div className="text-[10.5px] text-[#AAA] mt-1 px-1 italic">
                Sending…
              </div>
            )}

            {msg.status === "failed" && (
              <div className="flex gap-1.5 items-center px-1 mt-1">
                <span className="text-[10.5px] text-[#C0392B]">
                  Failed to send
                </span>

                <button
                  onClick={() => retry(msg.localId)}
                  className="text-[10.5px] text-brand-teal font-bold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="flex-none flex gap-2.5 px-3.5 py-3 border-t border-[#EEE] bg-white">

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message your trade partner…"
          maxLength={1000}
          className="flex-1 h-[42px] rounded-full border-[1.5px] border-[#E2E2E2] px-4 text-[13.5px] outline-none focus:border-brand-teal"
        />

        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          aria-label="Send message"
          className="w-[42px] h-[42px] rounded-full bg-brand-teal flex items-center justify-center cursor-pointer flex-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 12H20M20 12L14 6M20 12L14 18"
              stroke="white"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}