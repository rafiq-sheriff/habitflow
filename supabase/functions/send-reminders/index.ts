import { createClient } from "npm:@supabase/supabase-js@2";
import { buildPushHTTPRequest } from "npm:@pushforge/builder";

type ProfileRow = {
  id: string;
  reminder_time: string | null;
  timezone: string | null;
};

type PushSubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type DueUser = {
  user_id: string;
  sent_date: string; // YYYY-MM-DD (local date in user's timezone)
};

const adminContact = "mailto:no-reply@example.com";

function getLocalTimeAndDate(timeZone: string, now: Date): { localTime: string; localDate: string } {
  // Cache formatters by timezone (Intl.DateTimeFormat creation is relatively expensive).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache: Map<string, any> = (getLocalTimeAndDate as any)._cache ?? new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (getLocalTimeAndDate as any)._cache = cache;

  const timeKey = `${timeZone}:time`;
  const dateKey = `${timeZone}:date`;

  if (!cache.has(timeKey)) {
    cache.set(
      timeKey,
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    );
  }
  if (!cache.has(dateKey)) {
    cache.set(
      dateKey,
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    );
  }

  const timeFormatter = cache.get(timeKey) as Intl.DateTimeFormat;
  const dateFormatter = cache.get(dateKey) as Intl.DateTimeFormat;

  const timeParts = timeFormatter.formatToParts(now);
  const hour = timeParts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = timeParts.find((p) => p.type === "minute")?.value ?? "00";
  const localTime = `${hour}:${minute}`;

  const dateParts = dateFormatter.formatToParts(now);
  const year = dateParts.find((p) => p.type === "year")?.value ?? "1970";
  const month = dateParts.find((p) => p.type === "month")?.value ?? "01";
  const day = dateParts.find((p) => p.type === "day")?.value ?? "01";
  const localDate = `${year}-${month}-${day}`;

  return { localTime, localDate };
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
      status: 500,
    });
  }
  if (!vapidPrivateKey) {
    return new Response(JSON.stringify({ error: "Missing VAPID_PRIVATE_KEY secret" }), { status: 500 });
  }

  const privateJwk = JSON.parse(vapidPrivateKey);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();

  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, reminder_time, timezone")
    .eq("reminder_enabled", true);

  if (profileErr) {
    return new Response(JSON.stringify({ error: profileErr.message }), { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }));
  }

  const dueUsers: DueUser[] = [];

  for (const p of profiles as ProfileRow[]) {
    if (!p.reminder_time || !p.timezone) continue;

    const { localTime, localDate } = getLocalTimeAndDate(p.timezone, now);
    if (localTime === p.reminder_time) {
      dueUsers.push({ user_id: p.id, sent_date: localDate });
    }
  }

  if (dueUsers.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }));
  }

  const dueUserIds = Array.from(new Set(dueUsers.map((d) => d.user_id)));
  const dueSentDates = Array.from(new Set(dueUsers.map((d) => d.sent_date)));

  // Dedup: find already-sent notification logs for these users/dates.
  const { data: existingLogs } = await supabase
    .from("notification_logs")
    .select("user_id, sent_date")
    .in("user_id", dueUserIds)
    .in("sent_date", dueSentDates);

  const sentSet = new Set<string>(
    (existingLogs ?? []).map((l: { user_id: string; sent_date: string }) => `${l.user_id}|${l.sent_date}`),
  );

  const { data: subscriptions, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", dueUserIds);

  if (subsErr) {
    return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 });
  }

  const subByUser = new Map<string, PushSubscriptionRow>();
  for (const s of (subscriptions ?? []) as PushSubscriptionRow[]) {
    subByUser.set(s.user_id, s);
  }

  const toSend = dueUsers.filter((d) => {
    const key = `${d.user_id}|${d.sent_date}`;
    return !sentSet.has(key);
  });

  const successes: Array<{ user_id: string; sent_date: string; payload: unknown }> = [];

  // Send pushes (parallel) and record successes for logging.
  await Promise.all(
    toSend.map(async (d) => {
      const sub = subByUser.get(d.user_id);
      if (!sub) return;

      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      const payload = {
        title: "HabitFlow Reminder",
        body: "Time for your daily habit check-in.",
        url: "/daily",
        tag: `habitflow-${d.sent_date}`,
      };

      const { endpoint, headers, body } = await buildPushHTTPRequest({
        privateJWK: privateJwk,
        subscription,
        message: {
          payload,
          adminContact,
        },
      });

      const res = await fetch(endpoint, { method: "POST", headers, body });

      // Some browsers return 404/410 for expired subscriptions.
      if (res.status === 404 || res.status === 410) {
        await supabase.from("push_subscriptions").delete().eq("user_id", d.user_id);
        return;
      }

      if (res.status >= 200 && res.status < 300) {
        successes.push({ user_id: d.user_id, sent_date: d.sent_date, payload });
      }
    }),
  );

  if (successes.length > 0) {
    await supabase.from("notification_logs").upsert(
      successes.map((s) => ({
        user_id: s.user_id,
        sent_date: s.sent_date,
        payload: s.payload,
      })),
      { onConflict: "user_id,sent_date" },
    );
  }

  return new Response(JSON.stringify({ ok: true, sent: successes.length }));
});

