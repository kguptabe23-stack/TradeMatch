const STRIPE_PATTERN =
  "repeating-linear-gradient(135deg, #444 0 10px, #555 10px 20px)";

function Thumbnail({ listing, className }) {
  const coverUrl = listing.imageUrls?.[0];
  return (
    <div
      className={`absolute w-[110px] h-[110px] rounded-3xl border-[3px] border-white bg-cover bg-center ${className}`}
      style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : { backgroundImage: STRIPE_PATTERN }}
    />
  );
}

export default function MatchOverlay({
  myListing,
  theirListing,
  theirOwnerName,
  onSayHi,
  onKeepBrowsing,
}) {
  return (
    <div className="absolute inset-0 bg-[#121212]/96 flex flex-col items-center justify-center px-8 text-white text-center">
      <div className="font-poppins text-3xl font-bold text-brand-coral">
        It&apos;s a match!
      </div>
      <div className="text-[13px] opacity-85 mt-2">
        You and {theirOwnerName} both want to trade.
      </div>

      <div className="relative h-[120px] w-[190px] mt-6">
        <Thumbnail listing={myListing} className="left-0 top-0 rotate-[-9deg]" />
        <Thumbnail listing={theirListing} className="right-0 top-2.5 rotate-9" />
      </div>

      <div className="text-xs opacity-80 mt-4">
        {theirListing.title} ↔ {myListing.title}
      </div>

      <div className="flex flex-col gap-2.5 mt-[22px] w-full max-w-[220px]">
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
