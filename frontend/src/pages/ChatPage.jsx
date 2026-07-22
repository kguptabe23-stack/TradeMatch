import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
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

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  // Optimistic, not-yet-confirmed sends: { localId, text, status }
  const [pending, setPending] = useState([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef(null);
  const lastCreatedAtRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/matches").then((data) => {
      if (!cancelled) setMatch(data.matches.find((m) => m.id === matchId) || null);
    });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const fetchMessages = useCallback(
    async (after) => {
      const query = after ? `?after=${encodeURIComponent(after)}` : "";
      const { messages } = await apiFetch(`/api/matches/${matchId}/messages${query}`);
      return messages;
    },
    [matchId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initial = await fetchMessages();
      if (cancelled) return;
      setMessages(initial);
      if (initial.length) lastCreatedAtRef.current = initial[initial.length - 1].createdAt;
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMessages]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const fresh = await fetchMessages(lastCreatedAtRef.current);
      if (fresh.length) {
        setMessages((prev) => [...prev, ...fresh]);
        lastCreatedAtRef.current = fresh[fresh.length - 1].createdAt;
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  async function send(text, localId) {
    try {
      const { message } = await apiFetch(`/api/matches/${matchId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setPending((p) => p.filter((m) => m.localId !== localId));
      setMessages((prev) => [...prev, message]);
      lastCreatedAtRef.current = message.createdAt;
    } catch {
      setPending((p) => p.map((m) => (m.localId === localId ? { ...m, status: "failed" } : m)));
    }
  }

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const localId = `local-${Date.now()}-${Math.random()}`;
    setPending((p) => [...p, { localId, text, status: "sending" }]);
    send(text, localId);
  }

  function retry(localId) {
    const item = pending.find((m) => m.localId === localId);
    if (!item) return;
    setPending((p) => p.map((m) => (m.localId === localId ? { ...m, status: "sending" } : m)));
    send(item.text, localId);
  }

  if (!match) {
    return <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">Loading…</div>;
  }

  const isUserA = match.userAId === user.id;
  const myListing = isUserA ? match.listingA : match.listingB;
  const theirListing = isUserA ? match.listingB : match.listingA;
  const theirOwner = isUserA ? match.userB : match.userA;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-14 shrink-0 flex items-center gap-2.5 px-3.5 border-b border-[#EEE]">
        <button
          onClick={() => navigate("/matches")}
          className="w-8 h-8 rounded-full border border-[#E5E5E5] bg-white flex items-center justify-center cursor-pointer flex-none"
        >
          <svg width="14" height="14" viewBox="0 0 24 24">
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
        <span className="font-poppins font-bold text-base text-[#121212]">{theirOwner.name}</span>
      </div>

      <div className="bg-[#E6F7F5] px-4 py-2.5 text-xs text-[#00786D] border-b border-[#D8EFEB]">
        Trading: {theirListing.title} ↔ {myListing.title}
      </div>

      <div ref={listRef} className="flex-1 overflow-auto p-4 flex flex-col gap-2.5">
        {!loaded && (
          <div className="flex-1 flex items-center justify-center text-[#999] text-sm">Loading messages…</div>
        )}
        {loaded && messages.length === 0 && pending.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-[#999] text-sm text-center px-8">
            You matched with {theirOwner.name} — say hi!
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.senderId === user.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[78%] ${mine ? "items-end self-end" : "items-start self-start"}`}
            >
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-snug ${
                  mine ? "bg-brand-teal text-white" : "bg-[#F0F0F0] text-[#222]"
                }`}
              >
                {msg.text}
              </div>
              <div className="text-[10.5px] text-[#aaa] mt-1 px-1">{formatTime(msg.createdAt)}</div>
            </div>
          );
        })}
        {pending.map((msg) => (
          <div key={msg.localId} className="flex flex-col max-w-[78%] items-end self-end">
            <div className="px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-snug bg-brand-teal text-white">
              {msg.text}
            </div>
            {msg.status === "sending" && (
              <div className="text-[10.5px] text-[#aaa] mt-1 px-1 italic">Sending…</div>
            )}
            {msg.status === "failed" && (
              <div className="flex gap-1.5 items-center px-1 mt-1">
                <span className="text-[10.5px] text-[#C0392B]">Failed to send</span>
                <span
                  onClick={() => retry(msg.localId)}
                  className="text-[10.5px] text-brand-teal font-bold cursor-pointer"
                >
                  Retry
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex-none flex gap-2.5 px-3.5 py-3 border-t border-[#EEE]">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message"
          className="flex-1 h-[42px] rounded-full border-[1.5px] border-[#E2E2E2] px-4 text-[13.5px] outline-none focus:border-brand-teal"
        />
        <button
          onClick={handleSend}
          className="w-[42px] h-[42px] rounded-full bg-brand-teal flex items-center justify-center cursor-pointer flex-none"
        >
          <svg width="17" height="17" viewBox="0 0 24 24">
            <path
              d="M4 12H20M20 12L14 6M20 12L14 18"
              stroke="white"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
