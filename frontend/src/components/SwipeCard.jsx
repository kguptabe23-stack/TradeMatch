import { forwardRef, useImperativeHandle, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";

const SWIPE_THRESHOLD = 90;
const FLY_DISTANCE = 700;

// Drag/gesture handling comes from Motion's `drag` primitive (pointer
// normalization, elastic constraints); the swipe-vs-drag threshold, the
// like/pass label reveal, and the fly-off-screen commit animation are all
// ours — see the swipe-library discussion this was built from.
const SwipeCard = forwardRef(function SwipeCard({ listing, onSwipeComplete, draggable }, ref) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);

  const photos = listing.imageUrls?.length > 0 ? listing.imageUrls : [null];
  const [photoIndex, setPhotoIndex] = useState(0);

  function fly(direction) {
    const target = direction === "RIGHT" ? FLY_DISTANCE : -FLY_DISTANCE;
    animate(x, target, { duration: 0.35, ease: "easeIn" }).then(() =>
      onSwipeComplete(direction)
    );
  }

  useImperativeHandle(ref, () => ({
    swipeRight: () => fly("RIGHT"),
    swipeLeft: () => fly("LEFT"),
  }));

  function handleDragEnd(_, info) {
    if (info.offset.x > SWIPE_THRESHOLD) fly("RIGHT");
    else if (info.offset.x < -SWIPE_THRESHOLD) fly("LEFT");
    else animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
  }

  // No wraparound — tapping past the last photo just stays put, same as
  // Tinder. These are `onTap` (a genuine tap gesture), not `onClick`, so
  // they coexist with the card's own `drag="x"` on the parent: a real drag
  // is captured by the ancestor, a stationary tap fires here.
  function prevPhoto() {
    setPhotoIndex((i) => Math.max(0, i - 1));
  }
  function nextPhoto() {
    setPhotoIndex((i) => Math.min(photos.length - 1, i + 1));
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

      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, rgba(18,18,18,.84), rgba(18,18,18,0) 55%)",
        }}
      />

      {photos.length > 1 && (
        <>
          <div className="absolute top-2.5 left-2.5 right-2.5 flex gap-1">
            {photos.map((_, i) => (
              <div key={i} className="flex-1 h-0.75 rounded-full bg-white/35 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: i <= photoIndex ? "100%" : "0%" }}
                />
              </div>
            ))}
          </div>
          <motion.div onTap={prevPhoto} className="absolute inset-y-0 left-0 w-1/2" />
          <motion.div onTap={nextPhoto} className="absolute inset-y-0 right-0 w-1/2" />
        </>
      )}

      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-5 left-4.5 bg-brand-coral text-white font-poppins font-bold text-[15px] px-4 py-1.75 rounded-full rotate-[-10deg]"
      >
        YES PLEASE
      </motion.div>
      <motion.div
        style={{ opacity: passOpacity }}
        className="absolute top-5 right-4.5 bg-brand-teal text-white font-poppins font-bold text-[15px] px-4 py-1.75 rounded-full rotate-10"
      >
        PASS
      </motion.div>

      <div className="absolute left-0 right-0 bottom-0 px-5 pb-5.5 pt-5 text-white pointer-events-none">
        <div className="font-poppins font-bold text-[21px]">{listing.title}</div>
        <div className="text-[13px] leading-normal mt-1.5 opacity-90 max-w-70">
          {listing.description}
        </div>
        {listing.wantedTags?.length > 0 && (
          <div className="flex gap-1.5 mt-2.5 flex-wrap">
            {listing.wantedTags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium px-2.5 py-1.25 rounded-full bg-white/20 border border-white/35"
              >
                wants: {tag}
              </span>
            ))}
          </div>
        )}
        <div className="text-xs mt-2.5 opacity-80">Listed by {listing.owner?.name}</div>
      </div>
    </motion.div>
  );
});

export default SwipeCard;
