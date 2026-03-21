import { useEffect, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { sb } from "@/lib/supabaseClient";
import { fmtTime } from "@/lib/dateUtils";
import type { ProfileRow } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const TIMES = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
];

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** Converts a base64url VAPID key to Uint8Array (required by PushManager.subscribe). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function SettingsPage() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [remTime, setRemTime] = useState("21:00");
  const [remEnabled, setRemEnabled] = useState(false);
  const [pw, setPw] = useState("");
  const [pwMode, setPwMode] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    void (async () => {
      const { data: profile } = await sb.from("profiles").select("*").eq("id", uid).single();
      if (c || !profile) {
        setLoading(false);
        return;
      }
      const p = profile as ProfileRow;
      setFullName(p.full_name || "");
      setTimezone(p.timezone || "Asia/Kolkata");
      setRemTime(p.reminder_time?.slice(0, 5) || "21:00");
      setRemEnabled(p.reminder_enabled || false);
      setLoading(false);
    })();
    return () => {
      c = true;
    };
  }, [uid]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setNotifPermission(Notification.permission);
  }, []);

  useEffect(() => {
    // Auto-sync push subscription with reminder toggle.
    if (loading) return;
    if (remEnabled) {
      void enablePushSubscription();
    } else {
      void disablePushSubscription();
    }
  }, [loading, remEnabled]);

  async function enablePushSubscription(): Promise<void> {
    if (pushBusy) return;
    if (!VAPID_PUBLIC_KEY) {
      setPushMsg("Missing VITE_VAPID_PUBLIC_KEY (needed for push subscriptions).");
      return;
    }
    setPushBusy(true);
    setPushMsg(null);

    try {
      if (typeof Notification === "undefined") {
        setNotifPermission(null);
        setPushMsg("Notifications are not supported in this browser.");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushMsg("Push messaging is not supported in this browser.");
        return;
      }

      const permission: NotificationPermission =
        Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      setNotifPermission(permission);

      if (permission !== "granted") {
        setPushMsg(
          permission === "denied"
            ? "Notifications are blocked by the browser. Please allow them in site settings."
            : "Notification permission not granted."
        );
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const json = subscription.toJSON() as {
        endpoint: string;
        keys?: { p256dh?: string; auth?: string };
      };

      const endpoint = json.endpoint;
      const p256dh = json.keys?.p256dh;
      const authKey = json.keys?.auth;

      if (!p256dh || !authKey) {
        setPushMsg("Push subscription keys missing. Try enabling notifications again.");
        return;
      }

      const { error } = await sb.from("push_subscriptions").upsert(
        {
          user_id: uid,
          endpoint,
          p256dh,
          auth: authKey,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        setPushMsg(error.message);
        return;
      }

      setPushMsg("✓ Notifications enabled");
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : "Failed to enable notifications.");
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePushSubscription(): Promise<void> {
    if (pushBusy) return;
    setPushBusy(true);
    setPushMsg(null);

    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await existing.unsubscribe();
        }
      }

      await sb.from("push_subscriptions").delete().eq("user_id", uid);
      setPushMsg("✓ Notifications disabled");
      if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : "Failed to disable notifications.");
    } finally {
      setPushBusy(false);
    }
  }

  async function savePw() {
    if (!pw || pw.length < 6) {
      setPwMsg("Min 6 characters");
      return;
    }
    const { error } = await sb.auth.updateUser({ password: pw });
    setPwMsg(error ? error.message : "✓ Password updated!");
    if (!error) {
      setPw("");
      setPwMode(false);
    }
  }

  async function saveSettings() {
    setSaveBusy(true);
    const { error } = await sb
      .from("profiles")
      .update({
        full_name: fullName,
        timezone,
        reminder_time: remTime,
        reminder_enabled: remEnabled,
      })
      .eq("id", uid);
    if (!error) {
      setSaveMsg(true);
      setTimeout(() => setSaveMsg(false), 3000);
    }
    setSaveBusy(false);
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Settings" subtitle="Profile, reminders & Push notifications" />
        <div style={{ padding: 40, textAlign: "center" }}>
          <div className="spinner" style={{ width: 26, height: 26 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Profile, reminders & Push notifications" />

      <Section title="Profile" icon="◈">
        <Field label="Full Name">
          <input className="inp" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        </Field>
        <Field label="Email">
          <input
            className="inp"
            value={session?.user?.email || ""}
            disabled
            style={{ opacity: 0.5, cursor: "not-allowed" }}
          />
        </Field>
        <Field label="Timezone">
          <select className="inp" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Daily Reminder" icon="◷">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>Enable Reminders</p>
            <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>Daily reminder via push notifications</p>
          </div>
          <ToggleSwitch value={remEnabled} onChange={setRemEnabled} />
        </div>
        {remEnabled && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(82px,1fr))",
              gap: 7,
              marginTop: 8,
            }}
          >
            {TIMES.map((t) => (
              <button
                key={t}
                type="button"
                style={{
                  padding: "8px 6px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  textAlign: "center",
                  background: t === remTime ? "linear-gradient(145deg, var(--color-primary), var(--color-primary-dark))" : "var(--bg-subtle)",
                  color: t === remTime ? "#fff" : "var(--text2)",
                  border: t === remTime ? "1px solid var(--color-primary-dark)" : "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "all .15s",
                }}
                onClick={() => setRemTime(t)}
              >
                {fmtTime(t)}
              </button>
            ))}
          </div>
        )}
        {remEnabled && (
          <div
            style={{
              marginTop: 10,
              padding: "12px 14px",
              background: "var(--blue-soft)",
              border: "1px solid rgba(14, 165, 233, 0.25)",
              borderRadius: 12,
              fontSize: 12,
              color: "var(--text2)",
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: "var(--color-blue)", fontWeight: 600 }}>⚙ Note:</span> Reminder set for{" "}
            <strong style={{ color: "var(--text)" }}>{fmtTime(remTime)}</strong> ({timezone}). Keep notification permission enabled in
            your browser to receive alerts.
          </div>
        )}
      </Section>

      <Section title="Push Notifications" icon="🔔">
        <div
          style={{
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 4,
          }}
        >
          <p style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600, marginBottom: 5 }}>Permission status</p>
          <p style={{ fontSize: 12, color: "var(--text2)", margin: 0, lineHeight: 1.7 }}>
            Browser permission:{" "}
            <strong style={{ color: "var(--text)" }}>{notifPermission ?? "unknown"}</strong>
            {VAPID_PUBLIC_KEY ? null : (
              <>
                <br />
                Missing `VITE_VAPID_PUBLIC_KEY` (needed for push subscriptions).
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
            {pushMsg ?? (remEnabled ? "Tap the button to enable notifications on this device." : "Enable reminders to request permission.")}
          </div>
          {remEnabled && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: "8px 16px", whiteSpace: "nowrap" }}
              onClick={() => void enablePushSubscription()}
              disabled={pushBusy || !VAPID_PUBLIC_KEY}
            >
              {pushBusy ? <span className="spinner" /> : "Enable Notifications"}
            </button>
          )}
        </div>
      </Section>

      <Section title="Security" icon="🔒">
        {pwMsg && (
          <p style={{ fontSize: 12, marginBottom: 8, color: pwMsg.includes("✓") ? "var(--yes)" : "var(--no)" }}>{pwMsg}</p>
        )}
        {pwMode && (
          <input
            className="inp"
            type="password"
            placeholder="Min. 6 characters"
            style={{ marginBottom: 9 }}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        )}
        <div style={{ display: "flex", gap: 7 }}>
          {!pwMode ? (
            <button type="button" className="btn btn-secondary" style={{ fontSize: 13, alignSelf: "flex-start" }} onClick={() => setPwMode(true)}>
              Change Password
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => void savePw()}>
                Update
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => {
                  setPwMode(false);
                  setPwMsg(null);
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </Section>

      <div style={{ marginTop: 4, paddingBottom: 8, display: "flex", alignItems: "center" }}>
        <button type="button" className="btn btn-primary" style={{ padding: "12px 28px", fontSize: 14 }} onClick={() => void saveSettings()} disabled={saveBusy}>
          {saveBusy ? <span className="spinner" /> : "Save Settings"}
        </button>
        <span style={{ marginLeft: 12, fontSize: 12, color: "var(--yes)", opacity: saveMsg ? 1 : 0, transition: "opacity .3s" }}>
          ✓ All changes saved
        </span>
      </div>
    </>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 14,
          paddingBottom: 11,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: 13 }}>{icon}</span>
        <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-h3)", fontWeight: 600 }}>{title}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500, display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className="sw-wrap"
      style={{
        background: value ? "var(--color-primary)" : "var(--bg-subtle)",
        border: `1px solid ${value ? "var(--color-primary-dark)" : "var(--border)"}`,
      }}
      onClick={() => onChange(!value)}
    >
      <div className="sw-knob" style={{ left: value ? 23 : 3 }} />
    </button>
  );
}
