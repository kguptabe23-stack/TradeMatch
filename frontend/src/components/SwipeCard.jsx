import { forwardRef, useImperativeHandle, useState } from "react";

import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "motion/react";

const SWIPE_THRESHOLD = 90;

const FLY_DISTANCE = 700;

const SwipeCard = forwardRef(function SwipeCard(
  {
    listing,
    compatibility,
    onSwipeComplete,
    draggable,
  },
  ref
) {
  const x = useMotionValue(0);

  const rotate = useTransform(
    x,
    [-200, 0, 200],
    [-18, 0, 18]
  );

  const likeOpacity = useTransform(
    x,
    [20, 120],
    [0, 1]
  );

  const passOpacity = useTransform(
    x,
    [-120, -20],
    [1, 0]
  );

  const photos =
    listing.imageUrls?.length > 0
      ? listing.imageUrls
      : [null];

  const [photoIndex, setPhotoIndex] = useState(0);

  function fly(direction) {
    const target =
      direction === "RIGHT"
        ? FLY_DISTANCE
        : -FLY_DISTANCE;

    animate(x, target, {
      duration: 0.35,
      ease: "easeIn",
    }).then(() => onSwipeComplete(direction));
  }

  useImperativeHandle(ref, () => ({
    swipeRight: () => fly("RIGHT"),
    swipeLeft: () => fly("LEFT"),
  }));

  function handleDragEnd(_, info) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      fly("RIGHT");
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      fly("LEFT");
    } else {
      animate(x, 0, {
        type: "spring",
        stiffness: 400,
        damping: 30,
      });
    }
  }

  function prevPhoto() {
    setPhotoIndex((i) => Math.max(0, i - 1));
  }

  function nextPhoto() {
    setPhotoIndex((i) =>
      Math.min(photos.length - 1, i + 1)
    );
  }

  const currentPhoto = photos[photoIndex];

  return (
    <motion.div
      data-testid="swipe-card"
      style={{ x, rotate }}
      drag={draggable ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 rounded-4xl overflow-hidden shadow-[0_10px_26px_rgba(0,0,0,0.14)] cursor-grab active:cursor-grabbing"
    >
      {/* IMAGE */}
      {currentPhoto ? (
        <img
          src={currentPhoto}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center px-8"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #D8D8D8 0 14px, #E4E4E4 14px 28px)",
          }}
        >
          <span className="font-mono text-[11px] uppercase tracking-wide text-black/50 text-center">
            No photo yet
          </span>
        </div>
      )}

      {/* DARK GRADIENT */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(18,18,18,.84), rgba(18,18,18,0) 55%)",
        }}
      />

      {/* PHOTO INDICATORS */}
      {photos.length > 1 && (
        <>
          <div className="absolute top-2.5 left-2.5 right-2.5 flex gap-1">
            {photos.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-0.75 rounded-full bg-white/35 overflow-hidden"
              >
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width:
                      i <= photoIndex
                        ? "100%"
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          <motion.div
            onTap={prevPhoto}
            className="absolute inset-y-0 left-0 w-1/2"
          />

          <motion.div
            onTap={nextPhoto}
            className="absolute inset-y-0 right-0 w-1/2"
          />
        </>
      )}

      {/* LIKE LABEL */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-5 left-4.5 bg-brand-coral text-white font-poppins font-bold text-[15px] px-4 py-1.75 rounded-full rotate-[-10deg]"
      >
        YES PLEASE
      </motion.div>

      {/* PASS LABEL */}
      <motion.div
        style={{ opacity: passOpacity }}
        className="absolute top-5 right-4.5 bg-brand-teal text-white font-poppins font-bold text-[15px] px-4 py-1.75 rounded-full rotate-10"
      >
        PASS
      </motion.div>

      {/* LISTING INFORMATION */}
      <div className="absolute left-0 right-0 bottom-0 px-5 pb-5.5 pt-5 text-white pointer-events-none">

        {/* COMPATIBILITY SCORE */}
        {compatibility && (
  <div className="inline-flex items-center gap-1.5 mb-2.5 px-3 py-1.5 rounded-full bg-white/95 border border-gray-200 shadow-sm">
    <span className="text-[13px]">🎯</span>
    <span className="font-poppins font-bold text-[12px] text-[#121212]">
      {compatibility.score}% Trade Compatibility
    </span>
  </div>
)}

        {/* TITLE */}
        <div className="font-poppins font-bold text-[21px]">
          {listing.title}
        </div>

        {/* CATEGORY + CONDITION */}
        {(listing.category || listing.condition) && (
          <div className="text-[12px] mt-1.5 opacity-80">
            {listing.category}

            {listing.category && listing.condition
              ? " • "
              : ""}

            {listing.condition
              ?.replace("_", " ")
              .toLowerCase()
              .replace(/\b\w/g, (char) =>
                char.toUpperCase()
              )}
          </div>
        )}

        {/* DESCRIPTION */}
        <div className="text-[13px] leading-normal mt-1.5 opacity-90 max-w-70">
          {listing.description}
        </div>

        {/* OFFERED TAGS */}
        {listing.tags?.length > 0 && (
          <div className="flex gap-1.5 mt-2.5 flex-wrap">
            {listing.tags.map((tag) => (
              <span
                key={`offer-${tag}`}
                className="text-[11px] font-medium px-2.5 py-1.25 rounded-full bg-brand-teal/70 border border-white/25"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* WANTED TAGS */}
        {listing.wantedTags?.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {listing.wantedTags.map((tag) => (
              <span
                key={`want-${tag}`}
                className="text-[11px] font-medium px-2.5 py-1.25 rounded-full bg-white/20 border border-white/35"
              >
                wants: {tag}
              </span>
            ))}
          </div>
        )}

        {/* OWNER */}
        <div className="text-xs mt-2.5 opacity-80">
          Listed by {listing.owner?.name}
        </div>
      </div>
    </motion.div>
  );
});

export default SwipeCard;