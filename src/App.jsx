import { useState, Component } from "react";
import LiveIntelDashboard from "./LiveIntelDashboard";
import LandingPage from "./LandingPage";

// Global error boundary — prevents white screen of death
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#0B0F14", display: "flex",
          alignItems: "center", justifyContent: "center", flexDirection: "column",
          color: "#E5E7EB", fontFamily: "monospace", padding: 32,
        }}>
          <div style={{ color: "#FF3B30", fontSize: "1.5rem", fontWeight: 700, letterSpacing: 3, marginBottom: 16 }}>
            SYSTEM ERROR
          </div>
          <div style={{ color: "rgba(229,231,235,0.5)", fontSize: "0.85rem", marginBottom: 24, maxWidth: 500, textAlign: "center" }}>
            {this.state.error.message || "An unexpected error occurred"}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              padding: "12px 32px", borderRadius: 8, background: "rgba(0,229,255,0.15)",
              border: "1px solid rgba(0,229,255,0.3)", color: "#00E5FF",
              fontFamily: "monospace", fontSize: "0.9rem", fontWeight: 700,
              letterSpacing: 2, cursor: "pointer",
            }}
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [entered, setEntered] = useState(false);

  return (
    <ErrorBoundary>
      {entered ? (
        <LiveIntelDashboard />
      ) : (
        <LandingPage onEnter={() => setEntered(true)} />
      )}
    </ErrorBoundary>
  );
}
