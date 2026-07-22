export default function BrandMark({ size = 30, textClassName = "text-xl" }) {
  const radius = Math.round(size * 0.3);
  const iconSize = Math.round(size * 0.55);

  return (
    <div className="flex items-center gap-2">
      <div
        style={{ width: size, height: size, borderRadius: radius }}
        className="bg-brand-teal flex items-center justify-center shrink-0"
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <path
            d="M4 9H17M17 9L12.5 4.5M17 9L12.5 13.5"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 15H7M7 15L11.5 10.5M7 15L11.5 19.5"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className={`font-poppins font-bold ${textClassName} text-[#121212] tracking-[-0.01em]`}>
        Barter
      </span>
    </div>
  );
}
