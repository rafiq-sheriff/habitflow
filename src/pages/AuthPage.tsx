import { useState, type FormEvent } from "react";
import { sb } from "@/lib/supabaseClient";

type Mode = "login" | "signup";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errHtml, setErrHtml] = useState<string | null>(null);
  const [okHtml, setOkHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrHtml(null);
    setOkHtml(null);
    try {
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) {
          /* session set via onAuthStateChange */
        } else if (data.user && !data.session) {
          setOkHtml(
            `✉️ <strong>Check your email!</strong><br><span style="font-size:12px;opacity:.85">A confirmation link was sent to <strong>${email}</strong>. Click it, then come back and Sign In.</span>`,
          );
        } else {
          setErrHtml("Signup failed — no user or session returned. Try again.");
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          /* onAuthStateChange */
        }
      }
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Network error";
      if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
        msg =
          "⚠️ Network blocked — this app must be opened in a browser tab, not inside the Claude preview. Download the file and open it directly.";
      } else if (msg.includes("Email not confirmed")) {
        msg =
          "✉️ Please confirm your email first — check your inbox for a link from Supabase, then sign in.";
      }
      setErrHtml(msg);
    }
    setBusy(false);
  }

  const orb1 = (
    <div
      style={{
        position: "absolute",
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle,rgba(124,106,247,.1) 0%,transparent 70%)",
        top: -150,
        left: -150,
        pointerEvents: "none",
      }}
    />
  );
  const orb2 = (
    <div
      style={{
        position: "absolute",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle,rgba(167,139,250,.07) 0%,transparent 70%)",
        bottom: -100,
        right: -100,
        pointerEvents: "none",
      }}
    />
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
      className="fade"
    >
      {orb1}
      {orb2}
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 15,
              background: "linear-gradient(135deg,#7c6af7,#a78bfa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              margin: "0 auto 14px",
              boxShadow: "0 8px 32px rgba(124,106,247,.35)",
            }}
          >
            ✦
          </div>
          <h1 style={{ fontSize: 27, marginBottom: 6 }}>HabitFlow</h1>
          <p style={{ color: "var(--text2)", fontSize: 14 }}>Track habits. Reflect daily. Build streaks.</p>
        </div>
        <div className="card" style={{ padding: 28, boxShadow: "0 8px 40px rgba(0,0,0,.6)" }}>
          <div
            style={{
              display: "flex",
              background: "var(--bg2)",
              borderRadius: 10,
              padding: 3,
              marginBottom: 22,
              gap: 3,
            }}
          >
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  padding: 8,
                  fontSize: 13,
                  background: mode === m ? "var(--bg3)" : "transparent",
                  color: mode === m ? "var(--text)" : "var(--text3)",
                  border: mode === m ? "1px solid var(--border2)" : "1px solid transparent",
                  borderRadius: 8,
                }}
                onClick={() => {
                  setMode(m);
                  setErrHtml(null);
                  setOkHtml(null);
                }}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          <form onSubmit={handleAuth}>
            {mode === "signup" && (
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--text2)",
                    fontWeight: 500,
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Full Name
                </label>
                <input
                  className="inp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--text2)",
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Email
              </label>
              <input
                className="inp"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--text2)",
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Password
              </label>
              <input
                className="inp"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            {errHtml && (
              <div className="msg-err" style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: errHtml }} />
            )}
            {okHtml && (
              <div className="msg-ok" style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: okHtml }} />
            )}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 15, marginTop: 4 }}
              disabled={busy}
            >
              {busy ? <span className="spinner" /> : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--text3)" }}>
          Daily reflection builds extraordinary habits.
        </p>
      </div>
    </div>
  );
}
