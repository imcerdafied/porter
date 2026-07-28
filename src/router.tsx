import AdminKnowledgeBase from "./pages/AdminKnowledgeBase";
import GuestChat from "./pages/GuestChat";
import GmDashboard from "./pages/GmDashboard";
import OnboardingWizard from "./pages/OnboardingWizard";

export function AppRouter() {
  const segments = window.location.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  if (segments.length === 0) return <OnboardingWizard />;
  if (segments.length === 1 && segments[0] === "onboarding") return <OnboardingWizard />;
  if (segments.length === 1 && segments[0] === "dashboard") return <GmDashboard />;
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
