import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { today } from "@/lib/dateUtils";

export type AppShellOutletContext = {
  refreshDailyBadge: () => void;
};

const NAV: { path: string; label: string; icon: string; id: string }[] = [
  { id: "dashboard", path: "/dashboard", label: "Dashboard", icon: "◈" },
  { id: "daily", path: "/daily", label: "Daily Form", icon: "✦" },
  { id: "history", path: "/history", label: "History", icon: "◷" },
  { id: "questions", path: "/questions", label: "Questions", icon: "❋" },
  { id: "settings", path: "/settings", label: "Settings", icon: "⚙" },
];

export function AppShell() {
  const { session, signOut } = useAuth();
  const [badgeTick, setBadgeTick] = useState(0);
  const location = useLocation();

  const submittedToday = useMemo(() => {
    void badgeTick;
    return !!localStorage.getItem(`submitted_${today()}`);
  }, [badgeTick, location.pathname]);

  const name =
    session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "User";
  const init = name[0]?.toUpperCase() ?? "U";

  const outletCtx: AppShellOutletContext = {
    refreshDailyBadge: () => setBadgeTick((t) => t + 1),
  };

  return (
    <>
      <div id="sidebar">
        <div style={{ padding: "22px 18px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "linear-gradient(135deg,#7c6af7,#a78bfa)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              ✦
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Syne',sans-serif",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "var(--text)",
                }}
              >
                HabitFlow
              </div>
              <div style={{ fontSize: 10, color: "var(--text3)" }}>Daily Reflection</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map((n) => (
            <NavLink
              key={n.path}
              to={n.path}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
              style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>{n.icon}</span>
              <span style={{ color: "inherit" }}>{n.label}</span>
              {n.id === "daily" && (
                <span
                  style={{
                    marginLeft: "auto",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: submittedToday ? "var(--yes)" : "var(--accent)",
                    display: "block",
                    flexShrink: 0,
                    animation: submittedToday ? "none" : "pulse 2s infinite",
                  }}
                />
              )}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#7c6af7,#a78bfa)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              {init}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text3)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {session?.user?.email ?? ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            style={{
              width: "100%",
              padding: "7px 10px",
              borderRadius: 7,
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text3)",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              justifyContent: "center",
            }}
            onClick={() => void signOut()}
          >
            → Sign out
          </button>
        </div>
      </div>
      <div id="main">
        <div className="fade">
          <Outlet context={outletCtx} />
        </div>
      </div>
      <div id="mobile-nav">
        {NAV.map((n) => (
          <NavLink
            key={n.path}
            to={n.path}
            className={({ isActive }) => "mob-btn" + (isActive ? " active" : "")}
            style={{ textDecoration: "none" }}
          >
            <span style={{ fontSize: 19 }}>{n.icon}</span>
          </NavLink>
        ))}
      </div>
    </>
  );
}
