import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { PageHeader } from "@/components/PageHeader";
import { sb } from "@/lib/supabaseClient";
import { fmtDate } from "@/lib/dateUtils";
import type { QuestionRow } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

export function QuestionsPage() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("questions").select("*").eq("user_id", uid).order("sort_order").order("created_at");
    setQuestions((data as QuestionRow[]) || []);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  async function doAdd() {
    const text = newText.trim();
    if (!text) return;
    setAddBusy(true);
    const maxOrd = questions.length ? Math.max(...questions.map((q) => q.sort_order)) + 1 : 0;
    const { data, error } = await sb
      .from("questions")
      .insert({ user_id: uid, text, sort_order: maxOrd })
      .select()
      .single();
    if (error) setErr(error.message);
    else if (data) {
      setQuestions((q) => [...q, data as QuestionRow]);
      setNewText("");
      setAddOpen(false);
    }
    setAddBusy(false);
  }

  const active = questions.filter((q) => q.is_active).length;

  return (
    <>
      <PageHeader title="Questions" subtitle="" />
      <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 18 }}>
        {loading ? "Loading..." : `${active} active · ${questions.length} total · Drag to reorder`}
      </p>

      {err && (
        <div className="msg-err" style={{ display: "block" }}>
          {err}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 6, marginTop: -12 }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ display: addOpen ? "none" : "inline-flex" }}
          onClick={() => setAddOpen(true)}
        >
          + Add Question
        </button>
      </div>

      {addOpen && (
        <div
          style={{
            display: "block",
            background: "var(--teal-soft)",
            border: "1px solid rgba(20, 184, 166, 0.35)",
            borderRadius: 16,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-teal)", marginBottom: 8 }}>New Question</p>
          <textarea
            className="inp"
            placeholder="e.g. Did I exercise for 30 minutes today?"
            rows={2}
            style={{ resize: "vertical", marginBottom: 10 }}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void doAdd();
              }
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-primary" style={{ padding: "8px 18px", fontSize: 13 }} onClick={() => void doAdd()} disabled={addBusy}>
              {addBusy ? <span className="spinner" /> : "Add"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "8px 12px", fontSize: 13 }}
              onClick={() => {
                setAddOpen(false);
                setNewText("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 30, textAlign: "center" }}>
          <div className="spinner" style={{ width: 22, height: 22 }} />
        </div>
      ) : questions.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>❋</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>No questions yet</h3>
          <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 22, maxWidth: 300, margin: "0 auto 22px" }}>
            Add habits you want to track daily.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
            + Add First Question
          </button>
        </div>
      ) : (
        <>
          {questions.map((q, i) => (
            <QuestionListItem
              key={q.id}
              q={q}
              index={i}
              uid={uid}
              questions={questions}
              setQuestions={setQuestions}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
            />
          ))}
          <div className="tip">
            ✦ Disabled questions are hidden from daily forms but historical responses are preserved. Drag ⠿ to reorder.
          </div>
        </>
      )}
    </>
  );
}

function QuestionListItem({
  q,
  index,
  uid,
  questions,
  setQuestions,
  draggingId,
  setDraggingId,
}: {
  q: QuestionRow;
  index: number;
  uid: string;
  questions: QuestionRow[];
  setQuestions: Dispatch<SetStateAction<QuestionRow[]>>;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(q.text);
  const [saveBusy, setSaveBusy] = useState(false);
  const [local, setLocal] = useState(q);

  useEffect(() => {
    if (!editing) setLocal(q);
  }, [q, editing]);

  async function toggleActive() {
    await sb.from("questions").update({ is_active: !local.is_active }).eq("id", local.id).eq("user_id", uid);
    setLocal((x) => ({ ...x, is_active: !x.is_active }));
    setQuestions((qs) => qs.map((x) => (x.id === local.id ? { ...x, is_active: !x.is_active } : x)));
  }

  async function saveEdit() {
    const t = editText.trim();
    if (!t) return;
    setSaveBusy(true);
    await sb.from("questions").update({ text: t }).eq("id", local.id).eq("user_id", uid);
    setLocal((x) => ({ ...x, text: t }));
    setQuestions((qs) => qs.map((x) => (x.id === local.id ? { ...x, text: t } : x)));
    setEditing(false);
    setSaveBusy(false);
  }

  async function del() {
    if (!confirm("Delete this question? Historical responses are preserved.")) return;
    await sb.from("questions").delete().eq("id", local.id).eq("user_id", uid);
    setQuestions((qs) => qs.filter((x) => x.id !== local.id));
  }

  async function onDropOver(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const from = questions.findIndex((x) => x.id === draggingId);
    const to = questions.findIndex((x) => x.id === targetId);
    const reord = [...questions];
    const [moved] = reord.splice(from, 1);
    reord.splice(to, 0, moved!);
    const updated = reord.map((x, idx) => ({ ...x, sort_order: idx }));
    setQuestions(updated);
    await Promise.all(
      updated.map((x) => sb.from("questions").update({ sort_order: x.sort_order }).eq("id", x.id).eq("user_id", uid)),
    );
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 11,
        padding: "13px 15px",
        marginBottom: 8,
        transition: "all .15s",
        cursor: "grab",
      }}
      draggable
      onDragStart={(e) => {
        setDraggingId(local.id);
        e.currentTarget.style.opacity = "0.5";
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={(e) => {
        setDraggingId(null);
        e.currentTarget.style.opacity = "1";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.style.border = "1px solid rgba(20, 184, 166, 0.45)";
        e.currentTarget.style.background = "var(--teal-soft)";
      }}
      onDragLeave={(e) => {
        e.currentTarget.style.border = "1px solid var(--border)";
        e.currentTarget.style.background = "var(--card)";
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.style.border = "1px solid var(--border)";
        e.currentTarget.style.background = "var(--card)";
        void onDropOver(local.id);
      }}
      data-id={local.id}
    >
      {!editing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="drag-handle">⠿</span>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              flexShrink: 0,
              background: local.is_active ? "var(--accent-soft)" : "var(--bg-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: local.is_active ? "var(--color-primary-dark)" : "var(--text3)",
            }}
          >
            {String(index + 1).padStart(2, "0")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                color: local.is_active ? "var(--text)" : "var(--text3)",
                textDecoration: local.is_active ? "none" : "line-through",
                lineHeight: 1.4,
              }}
            >
              {local.text}
            </p>
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>
              Added {fmtDate(local.created_at.split("T")[0]!, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              type="button"
              title={local.is_active ? "Disable" : "Enable"}
              style={{
                width: 29,
                height: 29,
                borderRadius: 7,
                background: local.is_active ? "var(--yes-bg)" : "var(--bg-subtle)",
                border: `1px solid ${local.is_active ? "rgba(34, 197, 94, 0.35)" : "var(--border)"}`,
                color: local.is_active ? "var(--yes)" : "var(--text3)",
                cursor: "pointer",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .15s",
              }}
              onClick={() => void toggleActive()}
            >
              {local.is_active ? "◉" : "◎"}
            </button>
            <button
              type="button"
              title="Edit"
              style={{
                width: 29,
                height: 29,
                borderRadius: 7,
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text2)",
                cursor: "pointer",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .15s",
              }}
              onClick={() => {
                setEditText(local.text);
                setEditing(true);
              }}
            >
              ✎
            </button>
            <button
              type="button"
              title="Delete"
              style={{
                width: 29,
                height: 29,
                borderRadius: 7,
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text3)",
                cursor: "pointer",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .15s",
              }}
              onClick={() => void del()}
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            className="inp"
            rows={2}
            style={{ resize: "vertical", marginBottom: 9 }}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <div style={{ display: "flex", gap: 7 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "7px 15px", fontSize: 12 }}
              onClick={() => void saveEdit()}
              disabled={saveBusy}
            >
              {saveBusy ? <span className="spinner" /> : "Save"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "7px 11px", fontSize: 12 }}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
