export type UUID = string;
export type ISODate = string;

export interface AuthUser {
  id: UUID;
  email: string;
  display_name: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "traps"
  | "cardio";

export interface Exercise {
  id: UUID;
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: string | null;
  is_custom: boolean;
}

export type SetType = "working" | "warmup" | "drop" | "amrap" | "myo";

export interface ProgressionRule {
  type: "linear" | "double_progression" | "rpe_based";
  increment_kg?: number;
}

export interface TemplateExercise {
  id?: UUID;
  exercise_id: UUID;
  order_idx: number;
  superset_group_id?: UUID | null;
  target_sets: number;
  target_reps_low: number;
  target_reps_high: number;
  target_rpe?: number | null;
  rest_seconds: number;
  tempo?: string | null;
  progression_rule: ProgressionRule;
}

export interface WorkoutTemplate {
  id: UUID;
  name: string;
  notes: string | null;
  exercises: TemplateExercise[];
}

export interface LoggedSet {
  id: UUID;
  exercise_id: UUID;
  order_idx: number;
  set_number: number;
  set_type: SetType;
  parent_set_id: UUID | null;
  superset_group_id: UUID | null;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  tempo: string | null;
  notes: string | null;
  completed_at: ISODate;
}

export interface LoggedSetInput {
  exercise_id: UUID;
  order_idx: number;
  set_number: number;
  set_type?: SetType;
  parent_set_id?: UUID | null;
  superset_group_id?: UUID | null;
  weight_kg: number;
  reps: number;
  rpe?: number | null;
  tempo?: string | null;
  notes?: string | null;
  completed_at?: ISODate;
}

export interface WorkoutSession {
  id: UUID;
  template_id: UUID | null;
  started_at: ISODate;
  completed_at: ISODate | null;
  notes: string | null;
  bodyweight_kg: number | null;
  sets: LoggedSet[];
}

export interface DailyPoint {
  day: string; // yyyy-mm-dd
  score: number | null;
  sessions: number;
}

export interface Suggestion {
  weight_kg: number;
  reps_low: number;
  reps_high: number;
  reason: string;
}

export interface Dashboard {
  period: "day" | "week" | "month";
  period_start: string;
  period_end: string;
  score: number | null;
  sub_scores: {
    training: number | null;
    volume: number | null;
    strength: number | null;
    nutrition: number | null;
    recovery: number | null;
  };
  streak_days_trained: number;
  sessions_completed: number;
  sessions_planned: number;
  week_strip: DailyPoint[];
}
