import { Outlet } from "react-router-dom";
import TabBar from "../components/TabBar";

// Wraps the three tab-bar screens (Feed, Matches, My Listings) in a shared
// full-height frame. Screens that shouldn't show the tab bar (auth, the
// listing form, chat) mount outside this shell instead.
export default function AppShell() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      <div className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}
