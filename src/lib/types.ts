/** Row shapes used by the app (subset of Supabase tables/views). */

export type QuestionRow = {
  id: string;
  user_id: string;
  text: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type DailyEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
};

export type ResponseRow = {
  entry_id?: string;
  question_id?: string;
  question_text: string;
  answer: boolean;
  note: string | null;
};

export type DailySummaryRow = {
  entry_date: string;
  user_id: string;
  yes_count: number | null;
  no_count: number | null;
  yes_percentage: number | null;
  entry_id: string;
};

export type QuestionStatsRow = {
  question_text: string;
  yes_percentage: number | null;
  user_id: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  timezone: string | null;
  reminder_time: string | null;
  reminder_enabled: boolean | null;
};
