import AdminKnowledgeBase from "./pages/AdminKnowledgeBase";
import GuestChat from "./pages/GuestChat";
import Landing from "./pages/Landing";

export function AppRouter() {
  const segments = window.location.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  if (segments.length === 0) return <Landing />;
  if (segments.length === 2 && segments[0] === "admin") {
    return <AdminKnowledgeBase slug={segments[1]} />;
  }
  if (segments.length === 1) return <GuestChat slug={segments[0]} />;
  return (
    <main className="centered-state">
      <h1>Page not found</h1>
      <p>Check the concierge link and try again.</p>
    </main>
  );
}
