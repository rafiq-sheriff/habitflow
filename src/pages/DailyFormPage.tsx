import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { AppShellOutletContext } from "@/components/Layout/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { sb } from "@/lib/supabaseClient";
import { fmtDate, today } from "@/lib/dateUtils";
import type { QuestionRow, ResponseRow } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

function SubmittedSummary({ responses }: { responses: ResponseRow[] }) {
  const navigate = useNavigate();
  const yes = responses.filter((r) => r.answer).length;
  const no = responses.filter((r) => !r.answer).length;
  const pct = Math.round((yes / (responses.length || 1)) * 100);

  return (
    <>
      <div
        style={{
          background: "linear-gradient(135deg, var(--color-primary-light), rgba(20, 184, 166, 0.1))",
          border: "1px solid rgba(34, 197, 94, 0.22)",
          borderRadius: 16,
          padding: 28,
          marginBottom: 22,
          textAlign: "center",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
        <h2 style={{ fontSize: "var(--fs-h2)", marginBottom: 8 }}>Today&apos;s reflection done!</h2>
        <p style={{ color: "var(--text2)", fontSize: "var(--fs-body)", marginBottom: 20 }}>
          Great job. Keep that streak going!
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 28,
            flexWrap: "wrap",
            rowGap: 16,
          }}
        >
          {(
            [
              ["Yes", yes, "var(--yes)"],
              ["No", no, "var(--no)"],
              ["Score", `${pct}%`, "var(--color-teal)"],
            ] as const
          ).map(([l, v, c]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 28, fontWeight: 700, color: c }}>
                {String(v)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text3)",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {responses.map((r, i) => (
        <div
          key={i}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "11px 13px",
            display: "flex",
            gap: 9,
            alignItems: "flex-start",
            marginBottom: 7,
            animation: `fadeIn .3s ease ${i * 0.04}s both`,
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
              <p style={{ fontSize: 11, color: "var(--text2)", fontStyle: "italic", marginTop: 2 }}>
                &quot;{r.note}&quot;
              </p>
            ) : null}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => navigate("/history")}
        >
          History
        </button>
      </div>
    </>
  );
}

function QuestionCard({
  q,
  index,
  answer,
  note,
  onAnswer,
  onNote,
}: {
  q: QuestionRow;
  index: number;
  answer: boolean | null;
  note: string;
  onAnswer: (id: string, v: boolean | null) => void;
  onNote: (id: string, v: string) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const cardClass = "q-card" + (answer === true ? " yes" : answer === false ? " no" : "");

  return (
    <div className={cardClass}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 23,
            height: 23,
            borderRadius: 8,
            background: "var(--bg-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 700,
            color: "var(--text3)",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
        <p style={{ flex: 1, fontSize: 14, color: "var(--text)", lineHeight: 1.5, fontWeight: 500 }}>{q.text}</p>
      </div>
      <div className="form-toggle-row">
        <button
          type="button"
          className={"toggle-btn toggle-yes" + (answer === true ? " active" : "")}
          onClick={() => onAnswer(q.id, answer === true ? null : true)}
        >
          ✓ Yes
        </button>
        <button
          type="button"
          className={"toggle-btn toggle-no" + (answer === false ? " active" : "")}
          onClick={() => onAnswer(q.id, answer === false ? null : false)}
        >
          ✕ No
        </button>
        <button
          type="button"
          className="form-note-btn"
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            fontSize: 12,
            background: noteOpen ? "var(--bg-subtle)" : "transparent",
            border: "1px solid var(--border)",
            color: "var(--text3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          onClick={() => setNoteOpen((s) => !s)}
        >
          ✎ Note
        </button>
      </div>
      {noteOpen && (
        <textarea
          className="inp"
          placeholder="Optional reflection note..."
          rows={2}
          style={{ resize: "vertical", lineHeight: 1.5, marginTop: 10 }}
          value={note}
          onChange={(e) => onNote(q.id, e.target.value)}
        />
      )}
    </div>
  );
}

export function DailyFormPage() {
  const { session } = useAuth();
  const { refreshDailyBadge } = useOutletContext<AppShellOutletContext>();
  const navigate = useNavigate();
  const uid = session!.user.id;

  const [loading, setLoading] = useState(true);
  const [qs, setQs] = useState<QuestionRow[]>([]);
  const [submitted, setSubmitted] = useState<ResponseRow[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: questions } = await sb
      .from("questions")
      .select("*")
      .eq("user_id", uid)
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at");
    const { data: entry } = await sb
      .from("daily_entries")
      .select("*")
      .eq("user_id", uid)
      .eq("entry_date", today())
      .maybeSingle();

    const qlist = (questions as QuestionRow[]) || [];
    setQs(qlist);

    if (entry) {
      localStorage.setItem(`submitted_${today()}`, "1");
      refreshDailyBadge();
      const { data: resps } = await sb.from("responses").select("*").eq("entry_id", entry.id);
      setSubmitted((resps as ResponseRow[]) || []);
      setLoading(false);
      return;
    }

    const initA: Record<string, boolean | null> = {};
    const initN: Record<string, string> = {};
    qlist.forEach((q) => {
      initA[q.id] = null;
      initN[q.id] = "";
    });
    setAnswers(initA);
    setNotes(initN);
    setSubmitted(null);
    setLoading(false);
  }, [uid, refreshDailyBadge]);

  useEffect(() => {
    void load();
  }, [load]);

  const setAnswer = (id: string, v: boolean | null) => {
    setAnswers((a) => ({ ...a, [id]: v }));
  };
  const setNote = (id: string, v: string) => {
    setNotes((n) => ({ ...n, [id]: v }));
  };

  const doneCount = qs.filter((q) => answers[q.id] !== null && answers[q.id] !== undefined).length;
  const pct = qs.length ? (doneCount / qs.length) * 100 : 0;
  const canSubmit = qs.length > 0 && doneCount >= qs.length;

  async function handleSubmit() {
    setSubmitting(true);
    setErr(null);
    const { data: newEntry, error: ee } = await sb
      .from("daily_entries")
      .insert({ user_id: uid, entry_date: today() })
      .select()
      .single();
    if (ee) {
      setErr(ee.message.includes("unique") ? "Already submitted today!" : ee.message);
      setSubmitting(false);
      return;
    }
    const rows = qs.map((q) => ({
      entry_id: newEntry.id,
      question_id: q.id,
      question_text: q.text,
      answer: answers[q.id]!,
      note: notes[q.id] || null,
    }));
    await sb.from("responses").insert(rows);
    localStorage.setItem(`submitted_${today()}`, "1");
    refreshDailyBadge();
    setSubmitted(rows);
    setSubmitting(false);
  }

  const dateLabel = fmtDate(today(), { weekday: "long", month: "long", day: "numeric" });

  if (loading) {
    return (
      <>
        <PageHeader title="Daily Reflection" subtitle={dateLabel} />
        <div style={{ padding: 40, textAlign: "center" }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <PageHeader title="Daily Reflection" subtitle={dateLabel} />
        <SubmittedSummary responses={submitted} />
      </>
    );
  }

  if (!qs.length) {
    return (
      <>
        <PageHeader title="Daily Reflection" subtitle={dateLabel} />
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>❋</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>No active questions</h3>
          <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 22 }}>
            Set up your daily questions first.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/questions")}>
            Add Questions
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Daily Reflection" subtitle={dateLabel} />

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: "var(--text2)" }}>Progress</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary-dark)" }}>
            {doneCount} / {qs.length}
          </span>
        </div>
        <div className="prog-wrap">
          <div className="prog-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {err && <div className="msg-err">{err}</div>}

      {qs.map((q, i) => (
        <QuestionCard
          key={q.id}
          q={q}
          index={i}
          answer={answers[q.id] ?? null}
          note={notes[q.id] || ""}
          onAnswer={setAnswer}
          onNote={setNote}
        />
      ))}

      <button
        type="button"
        className="btn btn-primary"
        style={{
          width: "100%",
          justifyContent: "center",
          padding: 14,
          fontSize: 15,
          marginTop: 18,
          opacity: canSubmit ? 1 : 0.45,
        }}
        disabled={!canSubmit || submitting}
        onClick={() => void handleSubmit()}
      >
        {submitting ? (
          <>
            <span className="spinner" /> Submitting...
          </>
        ) : (
          "Submit Reflection ✦"
        )}
      </button>
      <p style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "var(--text3)" }}>
        Answer all questions to submit
      </p>
    </>
  );
}
