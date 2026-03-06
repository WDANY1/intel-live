import { useState } from "react";
import LandingPage from "./LandingPage";
import LiveIntelDashboard from "./LiveIntelDashboard";

export default function App() {
  const [showDashboard, setShowDashboard] = useState(
    () => !!localStorage.getItem("intel_entered") || !!localStorage.getItem("intel_api_key")
  );

  const handleEnter = () => {
    localStorage.setItem("intel_entered", "true");
    setShowDashboard(true);
  };

  if (!showDashboard) return <LandingPage onEnter={handleEnter} />;
  return <LiveIntelDashboard />;
}
