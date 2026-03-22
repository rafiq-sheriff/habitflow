import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sb } from "@/lib/supabaseClient";
import { fmtDate, today } from "@/lib/dateUtils";
import type { DailySummaryRow, QuestionStatsRow } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

function BarChart({
  dataArr,
}: {
  dataArr: { label: string; value: number; color?: string }[];
}) {
  const slice = dataArr.length > 20 ? dataArr.filter((_, i) => i % 2 === 0) : dataArr;
  return (
    <div className="chart-bars-scroll">
      <div className="chart-bars">
      {slice.map((d, i) => {
        const h = Math.round((d.value / 100) * 100);
        return (
          <div key={i} className="chart-bar-wrap">
            <div
              className="chart-bar"
              style={{
                width: "100%",
                height: `${Math.max(h, 2)}px`,
                background: d.color || "var(--color-teal)",
                opacity: d.value > 0 ? 1 : 0.3,
              }}
            />
            <div className="chart-bar-val">{d.value > 0 ? `${Math.round(d.value)}` : " "}</div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const uid = session!.user.id;
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DailySummaryRow[]>([]);
  const [qStats, setQStats] = useState<QuestionStatsRow[]>([]);

  const name = session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0];
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]!;
      const [{ data: summary }, { data: stats }] = await Promise.all([
        sb
          .from("v_daily_summary")
          .select("*")
          .eq("user_id", uid)
          .gte("entry_date", thirtyAgo)
          .order("entry_date"),
        sb.from("v_question_stats").select("*").eq("user_id", uid),
      ]);
      if (!cancelled) {
        setDays((summary as DailySummaryRow[]) || []);
        setQStats((stats as QuestionStatsRow[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const todayEntry = days.find((d) => d.entry_date === today());

  let streak = 0;
  const sorted = [...days].map((d) => d.entry_date).sort((a, b) => b.localeCompare(a));
  for (let i = 0; i < sorted.length; i++) {
    const exp = new Date(Date.now() - i * 86400000).toISOString().split("T")[0]!;
    if (sorted[i] === exp) streak++;
    else break;
  }
  const totalYes = days.reduce((s, d) => s + (d.yes_count || 0), 0);
  const avgScore = days.length
    ? Math.round(days.reduce((s, d) => s + (d.yes_percentage || 0), 0) / days.length)
    : 0;

  if (loading) {
    return (
      <>
        <div style={{ marginBottom: 22 }}>
          <p style={{ color: "var(--text2)", fontSize: "var(--fs-body)", marginBottom: 4 }}>{greet},</p>
          <h1 style={{ fontSize: "var(--fs-h1)", fontWeight: 700 }}>{name} 👋</h1>
        </div>
        <div style={{ padding: 40, textAlign: "center" }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <p style={{ color: "var(--text2)", fontSize: "var(--fs-body)", marginBottom: 4 }}>{greet},</p>
        <h1 style={{ fontSize: "var(--fs-h1)", fontWeight: 700 }}>{name} 👋</h1>
      </div>

      {!todayEntry && (
        <div
          className="dashboard-cta"
          style={{
            background: "linear-gradient(135deg, var(--color-primary-light), rgba(20, 184, 166, 0.12))",
            border: "1px solid rgba(34, 197, 94, 0.28)",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 24,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 200px" }}>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 4,
                color: "var(--text)",
              }}
            >
              Today&apos;s reflection is waiting ✦
            </div>
            <div style={{ fontSize: "var(--fs-small)", color: "var(--text2)" }}>
              {fmtDate(today(), { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>
          <div className="dashboard-cta-actions">
            <button
              type="button"
              className="btn btn-primary"
              style={{ flexShrink: 0, padding: "9px 16px", fontSize: 13 }}
              onClick={() => navigate("/daily")}
            >
              Start Now
            </button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        {(
          [
            ["🔥", "Current Streak", `${streak} days`, "var(--warning)"],
            ["📅", "Total Entries", String(days.length), "var(--color-teal)"],
            ["✓", "Avg Score", `${avgScore}%`, "var(--yes)"],
            ["✦", "Yes Answers", String(totalYes), "var(--color-blue)"],
          ] as const
        ).map(([icon, label, val, color]) => (
          <div key={label} className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span
                style={{
                  fontSize: "var(--fs-caption)",
                  color: "var(--text3)",
                  background: "var(--bg-subtle)",
                  padding: "3px 8px",
                  borderRadius: 20,
                  fontWeight: 600,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                }}
              >
                30d
              </span>
            </div>
            <div className="stat-val" style={{ color }}>
              {val}
            </div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-h3)", fontWeight: 600, marginBottom: 4 }}>
          30-Day Score Trend
        </div>
        <div style={{ fontSize: "var(--fs-caption)", color: "var(--text3)", marginBottom: 12, fontWeight: 500 }}>
          Daily yes % over last 30 days
        </div>
        {days.length > 1 ? (
          <BarChart
            dataArr={days.map((d, i) => ({
              label: new Date(d.entry_date + "T12:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              value: Number(d.yes_percentage || 0),
              color: i % 2 === 0 ? "var(--color-teal)" : "var(--color-blue)",
            }))}
          />
        ) : (
          <div
            style={{
              height: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text3)",
              fontSize: 13,
            }}
          >
            Complete more days to see trend
          </div>
        )}
      </div>

      <div className="dashboard-two-col">
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-h3)", fontWeight: 600, marginBottom: 4 }}>
            This Week
          </div>
          <div style={{ fontSize: "var(--fs-caption)", color: "var(--text3)", marginBottom: 12, fontWeight: 500 }}>
            Daily completion
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: 7 }, (_, j) => 6 - j).map((i) => {
              const d = new Date(Date.now() - i * 86400000);
              const ds = d.toISOString().split("T")[0]!;
              const entry = days.find((x) => x.entry_date === ds);
              const pct = entry?.yes_percentage || 0;
              let bg = "var(--bg-subtle)",
                color = "var(--text3)";
              if (entry) {
                bg =
                  pct >= 70
                    ? "var(--yes-bg)"
                    : pct >= 40
                      ? "var(--teal-soft)"
                      : "var(--no-bg)";
                color = pct >= 70 ? "var(--yes)" : pct >= 40 ? "var(--color-teal)" : "var(--no)";
              }
              return (
                <div key={ds} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      aspectRatio: "1",
                      borderRadius: 10,
                      background: bg,
                      border: `1px solid ${entry ? "var(--border)" : "var(--border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                      color,
                      marginBottom: 4,
                    }}
                  >
                    {entry ? String(Math.round(pct)) : d.getDate().toString()}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text3)" }}>
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-h3)", fontWeight: 600, marginBottom: 4 }}>
            Week Answers
          </div>
          <div style={{ fontSize: "var(--fs-caption)", color: "var(--text3)", marginBottom: 8, fontWeight: 500 }}>
            Yes (green) vs No (red)
          </div>
          {(() => {
            const weekData: { label: string; yes: number; no: number }[] = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date(Date.now() - i * 86400000);
              const ds = d.toISOString().split("T")[0]!;
              const entry = days.find((x) => x.entry_date === ds);
              weekData.push({
                label: d.toLocaleDateString("en-US", { weekday: "short" }),
                yes: entry?.yes_count || 0,
                no: entry?.no_count || 0,
              });
            }
            const maxWk = Math.max(1, ...weekData.map((d) => d.yes + d.no));
            return (
              <div className="chart-bars">
                {weekData.map((d) => {
                  const yH = Math.round((d.yes / maxWk) * 90);
                  const nH = Math.round((d.no / maxWk) * 90);
                  return (
                    <div key={d.label} className="chart-bar-wrap">
                      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 100 }}>
                        <div
                          className="chart-bar"
                          style={{ flex: 1, height: `${yH || 2}px`, background: "var(--yes)" }}
                        />
                        <div
                          className="chart-bar"
                          style={{ flex: 1, height: `${nH || 2}px`, background: "var(--no)" }}
                        />
                      </div>
                      <div className="chart-bar-label">{d.label}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {qStats.length > 0 && (
        <div className="card">
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-h3)", fontWeight: 600, marginBottom: 4 }}>
            Habit Performance
          </div>
          <div style={{ fontSize: "var(--fs-caption)", color: "var(--text3)", marginBottom: 16, fontWeight: 500 }}>
            All-time yes rate per habit
          </div>
          {[...qStats]
            .sort((a, b) => (b.yes_percentage || 0) - (a.yes_percentage || 0))
            .slice(0, 7)
            .map((q) => {
              const pct = q.yes_percentage || 0;
              const color = pct >= 70 ? "var(--yes)" : pct >= 40 ? "var(--color-teal)" : "var(--no)";
              return (
                <div key={q.question_text} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text)",
                        maxWidth: "82%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {q.question_text}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
                  </div>
                  <div className="perf-bar-wrap">
                    <div className="perf-bar" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </>
  );
}
