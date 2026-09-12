const STRIPE_PATTERN =
  "repeating-linear-gradient(135deg, #444 0 10px, #555 10px 20px)";

function Thumbnail({ listing, className }) {
  const coverUrl = listing?.imageUrls?.[0];

  return (
    <div
      className={`absolute w-[110px] h-[110px] rounded-3xl border-[3px] border-white bg-cover bg-center ${className}`}
      style={
        coverUrl
          ? { backgroundImage: `url(${coverUrl})` }
          : { backgroundImage: STRIPE_PATTERN }
      }
    />
  );
}

function ScoreRow({ label, value, max }) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-white/75">{label}</span>

      <div className="flex items-center gap-2">
        <div className="w-[70px] h-1.5 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-teal"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <span className="font-bold w-[35px] text-right">
          {value}/{max}
        </span>
      </div>
    </div>
  );
}

export default function MatchOverlay({
  myListing,
  theirListing,
  theirOwnerName,
  compatibility,
  onSayHi,
  onKeepBrowsing,
}) {
  const score = compatibility?.score ?? 0;
  const breakdown = compatibility?.breakdown || {};

  return (
    <div className="absolute inset-0 z-50 bg-[#121212]/97 flex flex-col items-center justify-center px-8 text-white text-center overflow-y-auto">
      {/* Heading */}
      <div className="text-4xl mb-1">🎉</div>

      <div className="font-poppins text-3xl font-bold text-brand-coral">
        It&apos;s a match!
      </div>

      <div className="text-[13px] text-white/75 mt-2">
        You and {theirOwnerName} both want to trade.
      </div>

      {/* Listing thumbnails */}
      <div className="relative h-[120px] w-[190px] mt-5">
        <Thumbnail
          listing={myListing}
          className="left-0 top-0 rotate-[-9deg]"
        />

        <Thumbnail
          listing={theirListing}
          className="right-0 top-2.5 rotate-9"
        />
      </div>

      {/* Trade titles */}
      <div className="text-[11px] text-white/65 mt-3 max-w-[250px]">
        {theirListing?.title} ↔ {myListing?.title}
      </div>

      {/* Compatibility score */}
      {compatibility && (
        <div className="w-full max-w-[260px] mt-5 rounded-2xl border border-white/10 bg-white/[0.07] px-5 py-4">
          <div className="text-[11px] uppercase tracking-wider text-white/55">
            Trade Compatibility
          </div>

          <div className="text-4xl font-poppins font-bold text-brand-teal mt-1">
            {score}%
          </div>

          <div className="text-[11px] text-white/55 mt-1">
            Based on what you offer and what you want
          </div>

          {/* Breakdown */}
          <div className="flex flex-col gap-2.5 mt-4">
            <ScoreRow
              label="Tag match"
              value={breakdown.tags ?? 0}
              max={40}
            />

            <ScoreRow
              label="Category"
              value={breakdown.category ?? 0}
              max={30}
            />

            <ScoreRow
              label="Description"
              value={breakdown.description ?? 0}
              max={20}
            />

            <ScoreRow
              label="Condition"
              value={breakdown.condition ?? 0}
              max={10}
            />
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-2.5 mt-5 w-full max-w-[220px]">
        <button
          onClick={onSayHi}
          className="bg-brand-coral text-white rounded-full py-[13px] text-sm font-bold cursor-pointer"
        >
          Say hi
        </button>

        <button
          onClick={onKeepBrowsing}
          className="bg-transparent text-white border-[1.5px] border-brand-teal rounded-full py-[13px] text-sm cursor-pointer"
        >
          Keep browsing
        </button>
      </div>
    </div>
  );
}