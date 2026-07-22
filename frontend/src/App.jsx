import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import AppShell from "./layouts/AppShell";
import PlainShell from "./layouts/PlainShell";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import ListingFormPage from "./pages/ListingFormPage";
import FeedPage from "./pages/FeedPage";
import MatchesPage from "./pages/MatchesPage";
import ChatPage from "./pages/ChatPage";
import MyListingsPage from "./pages/MyListingsPage";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">Loading…</div>
  );
}

function ProtectedRoute({ children }) {
  const { status } = useAuth();
  if (status === "loading") return <Spinner />;
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const { status } = useAuth();
  if (status === "loading") return <Spinner />;
  return <Navigate to={status === "authenticated" ? "/feed" : "/login"} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route element={<PlainShell />}>
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/listings/new"
              element={
                <ProtectedRoute>
                  <ListingFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/:id/edit"
              element={
                <ProtectedRoute>
                  <ListingFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches/:matchId"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/listings" element={<MyListingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
