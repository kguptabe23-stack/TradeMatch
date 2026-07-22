import { NavLink } from "react-router-dom";

const ACTIVE = "#00A896";
const INACTIVE = "#999";

function Tab({ to, label, icon }) {
  return (
    <NavLink to={to} className="flex-1 flex flex-col items-center justify-center gap-[3px]">
      {({ isActive }) => (
        <>
          {icon(isActive ? ACTIVE : INACTIVE)}
          <span className="text-[10.5px] font-semibold" style={{ color: isActive ? ACTIVE : INACTIVE }}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function TabBar() {
  return (
    <div className="flex-none h-16 flex border-t border-[#EEE] bg-white">
      <Tab
        to="/feed"
        label="Feed"
        icon={(color) => (
          <svg width="19" height="19" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="4" stroke={color} strokeWidth="2" fill="none" />
          </svg>
        )}
      />
      <Tab
        to="/matches"
        label="Matches"
        icon={(color) => (
          <svg width="19" height="19" viewBox="0 0 24 24">
            <path
              d="M12 21s-7-4.35-9.5-8.5C.8 9 2 5 6 4.3c2-.35 3.7.6 4.9 2.3.9-1.7 2.9-2.65 4.9-2.3 4 .7 5.2 4.7 3.5 8.2C19 16.65 12 21 12 21z"
              stroke={color}
              strokeWidth="2"
              fill="none"
            />
          </svg>
        )}
      />
      <Tab
        to="/listings"
        label="My Listings"
        icon={(color) => (
          <svg width="19" height="19" viewBox="0 0 24 24">
            <path d="M5 6H19M5 12H19M5 18H13" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        )}
      />
    </div>
  );
}
