import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";

const STRIPE_PATTERN = "repeating-linear-gradient(135deg, #D8D8D8 0 8px, #E4E4E4 8px 16px)";

export default function MyListingsPage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState(null); // null = loading
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    apiFetch("/api/listings/mine").then((data) => setListings(data.listings));
  }, []);

  async function toggleArchive(listing) {
    const nextStatus = listing.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    await apiFetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    setListings((ls) => ls.map((l) => (l.id === listing.id ? { ...l, status: nextStatus } : l)));
  }

  async function confirmDelete() {
    await apiFetch(`/api/listings/${deleteConfirmId}`, { method: "DELETE" });
    setListings((ls) => ls.filter((l) => l.id !== deleteConfirmId));
    setDeleteConfirmId(null);
  }

  const deleteTarget = listings?.find((l) => l.id === deleteConfirmId);

  if (listings === null) {
    return <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">Loading…</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="h-14 shrink-0 flex items-center justify-between px-[18px] border-b border-[#EEE]">
        <span className="font-poppins font-bold text-[17px] text-[#121212]">My Listings</span>
        <button
          onClick={() => navigate("/listings/new")}
          className="h-[34px] px-3.5 rounded-full border-[1.5px] border-brand-teal bg-white text-brand-teal font-bold text-[12.5px] cursor-pointer"
        >
          + New
        </button>
      </div>

      {listings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2.5 px-8 text-center">
          <div className="font-poppins font-bold text-[17px] text-[#121212]">Nothing listed yet</div>
          <div className="text-sm text-[#777]">Add an item to start trading.</div>
          <button
            onClick={() => navigate("/listings/new")}
            className="h-[42px] px-5 rounded-full bg-brand-coral text-white font-bold text-[13px] mt-1.5 cursor-pointer"
          >
            List your first item
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto py-1.5">
          {listings.map((l) => (
            <div key={l.id} className="flex gap-3 px-[18px] py-3.5 border-b border-[#F2F2F2]">
              <div className="w-[52px] h-[52px] rounded-xl flex-none overflow-hidden">
                {l.imageUrls?.[0] ? (
                  <img src={l.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundImage: STRIPE_PATTERN }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#121212]">{l.title}</span>
                  <span
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                      l.status === "ACTIVE" ? "bg-[#E6F7F5] text-[#00786D]" : "bg-[#F0F0F0] text-[#888]"
                    }`}
                  >
                    {l.status === "ACTIVE" ? "Active" : "Archived"}
                  </span>
                </div>
                <div className="text-[12.5px] text-[#777] mt-0.5 truncate">{l.description}</div>
                <div className="flex gap-3.5 mt-1.5">
                  <span
                    onClick={() => navigate(`/listings/${l.id}/edit`)}
                    className="text-xs font-semibold text-brand-teal cursor-pointer"
                  >
                    Edit
                  </span>
                  <span onClick={() => toggleArchive(l)} className="text-xs font-semibold text-[#777] cursor-pointer">
                    {l.status === "ACTIVE" ? "Archive" : "Unarchive"}
                  </span>
                  <span
                    onClick={() => setDeleteConfirmId(l.id)}
                    className="text-xs font-semibold text-brand-coral cursor-pointer"
                  >
                    Delete
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="absolute inset-0 bg-[#121212]/50 flex items-center justify-center px-6">
          <div className="bg-white rounded-[20px] px-5 py-6 w-full max-w-[280px] text-center">
            <div className="font-poppins font-bold text-base text-[#121212]">
              Delete &quot;{deleteTarget.title}&quot;?
            </div>
            <div className="text-[12.5px] text-[#777] mt-2 leading-normal">
              This is permanent. If you just want to hide it from the feed, archive it instead.
            </div>
            <div className="flex gap-2.5 mt-[18px]">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 h-10 rounded-full border-[1.5px] border-[#E2E2E2] bg-white text-[#333] font-semibold text-[13px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 h-10 rounded-full bg-brand-coral text-white font-bold text-[13px] cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
