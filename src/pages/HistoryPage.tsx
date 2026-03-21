import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { sb } from "@/lib/supabaseClient";
import { fmtDate } from "@/lib/dateUtils";
import type { DailySummaryRow, ResponseRow } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

type ViewMode = "calendar" | "list";
type FilterKey = "7" | "30" | "90" | "all";

export function HistoryPage() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const [view, setView] = useState<ViewMode>("calendar");
  const [filter, setFilter] = useState<FilterKey>("30");
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DailySummaryRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailResps, setDetailResps] = useState<ResponseRow[] | null>(null);
  const [detailEntry, setDetailEntry] = useState<DailySummaryRow | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setSelectedDate(null);
    setDetailResps(null);
    setDetailEntry(null);
    let q = sb.from("v_daily_summary").select("*").eq("user_id", uid).order("entry_date", { ascending: false });
    if (filter !== "all") {
      q = q.gte(
        "entry_date",
        new Date(Date.now() - Number(filter) * 86400000).toISOString().split("T")[0]!,
      );
    }
    const { data } = await q;
    setEntries((data as DailySummaryRow[]) || []);
    setLoading(false);
  }, [uid, filter]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const entList = entries;
  const numDays = filter === "all" ? 90 : Math.min(Number(filter), 90);
  const avg = entList.length
    ? Math.round(entList.reduce((s, e) => s + (e.yes_percentage || 0), 0) / entList.length)
    : 0;
  const best = entList.length ? Math.max(...entList.map((e) => e.yes_percentage || 0)) : 0;

  const entryMap: Record<string, DailySummaryRow> = {};
  entList.forEach((e) => {
    entryMap[e.entry_date] = e;
  });

  async function showDetail(entry: DailySummaryRow, date: string) {
    if (selectedDate === date) {
      setSelectedDate(null);
      setDetailResps(null);
      setDetailEntry(null);
      return;
    }
    setSelectedDate(date);
    setDetailEntry(entry);
    setDetailLoading(true);
    const { data: resps } = await sb.from("responses").select("*").eq("entry_id", entry.entry_id);
    setDetailResps((resps as ResponseRow[]) || []);
    setDetailLoading(false);
  }

  return (
    <>
      <PageHeader title="History" subtitle="Your reflection journey over time" />

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div
          style={{
            display: "flex",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            padding: 3,
            gap: 2,
          }}
        >
          {(["calendar", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 500,
                background: view === v ? "var(--bg-subtle)" : "transparent",
                color: view === v ? "var(--text)" : "var(--text3)",
                border: view === v ? "1px solid var(--border2)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all .15s",
              }}
              onClick={() => setView(v)}
            >
              {v === "calendar" ? "Calendar" : "List"}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            padding: 3,
            gap: 2,
            marginLeft: "auto",
          }}
        >
          {(
            [
              ["7", "7d"],
              ["30", "30d"],
              ["90", "90d"],
              ["all", "All"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              style={{
                padding: "6px 12px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 500,
                background: filter === v ? "var(--bg-subtle)" : "transparent",
                color: filter === v ? "var(--text)" : "var(--text3)",
                border: filter === v ? "1px solid var(--border2)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all .15s",
              }}
              onClick={() => setFilter(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div className="spinner" style={{ width: 24, height: 24 }} />
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {(
              [
                ["Entries", String(entList.length), "var(--text)"],
                ["Avg Score", `${avg}%`, "var(--color-teal)"],
                ["Best Day", `${best}%`, "var(--yes)"],
                ["Completion", `${Math.round((entList.length / numDays) * 100)}%`, "var(--color-blue)"],
              ] as const
            ).map(([l, v, c]) => (
              <div key={l} className="card" style={{ padding: "12px 13px" }}>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 700, color: c, marginBottom: 2 }}>
                  {v}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text3)",
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>

          {view === "calendar" ? (
            <CalendarView
              numDays={numDays}
              entryMap={entryMap}
              selectedDate={selectedDate}
              onSelectDay={(entry, date) => void showDetail(entry, date)}
            />
          ) : (
            <ListView
              entList={entList}
              selectedDate={selectedDate}
              onSelect={(entry, date) => void showDetail(entry, date)}
            />
          )}

          {selectedDate && detailEntry && (
            <div style={{ marginTop: 14 }}>
              {detailLoading ? (
                <div style={{ padding: 20, textAlign: "center" }}>
                  <div className="spinner" style={{ width: 20, height: 20 }} />
                </div>
              ) : (
                <div className="card">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h3 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-h3)", fontWeight: 600 }}>
                        {fmtDate(selectedDate, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </h3>
                      <div style={{ display: "flex", gap: 12, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: "var(--yes)" }}>✓ {detailEntry.yes_count}</span>
                        <span style={{ fontSize: 11, color: "var(--no)" }}>✕ {detailEntry.no_count}</span>
                        <span style={{ fontSize: 11, color: "var(--color-teal)", fontWeight: 600 }}>
                          {detailEntry.yes_percentage}% score
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: "5px 9px", fontSize: 12 }}
                      onClick={() => {
                        setSelectedDate(null);
                        setDetailResps(null);
                        setDetailEntry(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {(detailResps || []).map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        padding: "9px 11px",
                        background: "var(--bg-subtle)",
                        borderRadius: 10,
                        marginBottom: 6,
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: 19,
                          height: 19,
                          borderRadius: 5,
                          background: r.answer ? "var(--yes-bg)" : "var(--no-bg)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 700,
                          color: r.answer ? "var(--yes)" : "var(--no)",
                          marginTop: 1,
                        }}
                      >
                        {r.answer ? "✓" : "✕"}
                      </span>
                      <div>
                        <p style={{ fontSize: 13, color: "var(--text)" }}>{r.question_text}</p>
                        {r.note ? (
                          <p
                            style={{
                              fontSize: 11,
                              color: "var(--text2)",
                              fontStyle: "italic",
                              marginTop: 2,
                            }}
                          >
                            &quot;{r.note}&quot;
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

function CalendarView({
  numDays,
  entryMap,
  selectedDate,
  onSelectDay,
}: {
  numDays: number;
  entryMap: Record<string, DailySummaryRow>;
  selectedDate: string | null;
  onSelectDay: (entry: DailySummaryRow, date: string) => void;
}) {
  const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const calDays: { date: string; entry: DailySummaryRow | null; dow: number }[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const ds = d.toISOString().split("T")[0]!;
    calDays.push({ date: ds, entry: entryMap[ds] || null, dow: d.getDay() });
  }
  const firstDow = calDays[0]?.dow ?? 0;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="cal-grid" style={{ marginBottom: 4 }}>
        {DOW.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 10,
              color: "var(--text3)",
              padding: "3px 0",
              fontWeight: 600,
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {Array.from({ length: firstDow }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {calDays.map((d) => {
          const pct = d.entry?.yes_percentage || 0;
          let bg = "var(--bg-subtle)",
            color = "var(--text3)";
          if (d.entry) {
            bg =
              pct >= 70
                ? "var(--yes-bg)"
                : pct >= 40
                  ? "var(--teal-soft)"
                  : "var(--no-bg)";
            color = pct >= 70 ? "var(--yes)" : pct >= 40 ? "var(--color-teal)" : "var(--no)";
          }
          const isToday = d.date === new Date().toISOString().split("T")[0];
          const isSel = selectedDate === d.date;
          return (
            <div
              key={d.date}
              className={"cal-day" + (d.entry ? " has-entry" : "") + (isSel ? " selected" : "")}
              style={{
                background: isSel ? "var(--color-primary-light)" : bg,
                color: isSel ? "var(--color-primary-dark)" : color,
                border: isToday ? "2px solid var(--color-primary)" : "1px solid transparent",
              }}
              onClick={() => d.entry && onSelectDay(d.entry, d.date)}
              onKeyDown={(e) => {
                if (d.entry && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelectDay(d.entry!, d.date);
                }
              }}
              role={d.entry ? "button" : undefined}
              tabIndex={d.entry ? 0 : undefined}
            >
              {d.entry ? String(Math.round(pct)) : String(new Date(d.date + "T12:00").getDate())}
            </div>
          );
        })}
      </div>
      <div
        style={{ display: "flex", gap: 14, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}
      >
        {(
          [
            ["var(--yes-bg)", "var(--yes)", "≥70%"],
            ["var(--teal-soft)", "var(--color-teal)", "40-69%"],
            ["var(--no-bg)", "var(--no)", "<40%"],
            ["var(--bg-subtle)", "var(--text3)", "No entry"],
          ] as const
        ).map(([bg, c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: c }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: bg }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListView({
  entList,
  selectedDate,
  onSelect,
}: {
  entList: DailySummaryRow[];
  selectedDate: string | null;
  onSelect: (entry: DailySummaryRow, date: string) => void;
}) {
  const monthGroups: Record<string, DailySummaryRow[]> = {};
  entList.forEach((e) => {
    const m = e.entry_date.slice(0, 7);
    if (!monthGroups[m]) monthGroups[m] = [];
    monthGroups[m].push(e);
  });
  const months = Object.keys(monthGroups).sort((a, b) => b.localeCompare(a));

  if (months.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "var(--text3)", fontSize: 14 }}>
        No entries in this range
      </div>
    );
  }

  return (
    <>
      {months.map((month) => {
        const [y, mo] = month.split("-");
        const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        const mDays = monthGroups[month]!;
        const mAvg = Math.round(mDays.reduce((s, d) => s + (d.yes_percentage || 0), 0) / mDays.length);
        return (
          <div key={month} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
              <h3 style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-h3)", fontWeight: 600, color: "var(--text)" }}>
                {label}
              </h3>
              <span
                style={{
                  fontSize: "var(--fs-caption)",
                  color: "var(--color-teal)",
                  background: "var(--teal-soft)",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontWeight: 600,
                }}
              >
                {mDays.length} entries · {mAvg}% avg
              </span>
            </div>
            {mDays.map((e) => {
              const pct = e.yes_percentage || 0;
              const color = pct >= 70 ? "var(--yes)" : pct >= 40 ? "var(--color-teal)" : "var(--no)";
              const active = selectedDate === e.entry_date;
              return (
                <button
                  key={e.entry_date}
                  type="button"
                  className={"hist-btn" + (active ? " active" : "")}
                  onClick={() => onSelect(e, e.entry_date)}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 7,
                      flexShrink: 0,
                      background: pct >= 70 ? "var(--yes-bg)" : pct >= 40 ? "var(--teal-soft)" : "var(--no-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-sans)",
                      fontWeight: 800,
                      fontSize: 12,
                      color,
                    }}
                  >
                    {pct}%
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                      {fmtDate(e.entry_date, { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 1 }}>
                      {e.yes_count} Yes · {e.no_count} No
                    </div>
                  </div>
                  <span style={{ color: "var(--text3)", fontSize: 12 }}>›</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
