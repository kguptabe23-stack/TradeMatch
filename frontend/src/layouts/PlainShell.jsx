import { Outlet } from "react-router-dom";

// For screens that shouldn't show the tab bar: auth, the listing form, chat.
export default function PlainShell() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      <Outlet />
    </div>
  );
}
