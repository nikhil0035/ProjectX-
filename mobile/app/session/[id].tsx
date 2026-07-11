import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { RestTimer } from "@/components/RestTimer";
import { SetRow } from "@/components/SetRow";
import { radius, spacing, theme } from "@/lib/theme";
import { useActiveSession } from "@/stores/activeSession";

import type { LoggedSet, Suggestion, TemplateExercise, UUID } from "@/api/types";

interface ExerciseRow {
  exerciseId: UUID;
  name: string;
  orderIdx: number;
  target?: TemplateExercise;
  logged: LoggedSet[];
  drafts: { weight: string; reps: string; rpe: string; loggedId?: string }[];
  suggestion?: Suggestion;
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const startRest = useActiveSession((s) => s.startRest);
  const setSessionActive = useActiveSession((s) => s.setSession);

  const sessionQ = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.sessions.get(id!),
    enabled: !!id,
  });

  const exercisesQ = useQuery({
    queryKey: ["exercises"],
    queryFn: () => api.exercises.list(),
  });

  const templateQ = useQuery({
    queryKey: ["template", sessionQ.data?.template_id],
    queryFn: () => api.templates.get(sessionQ.data!.template_id!),
    enabled: !!sessionQ.data?.template_id,
  });

  const [rows, setRows] = useState<ExerciseRow[]>([]);

  useEffect(() => {
    setSessionActive(id ?? null);
    return () => setSessionActive(null);
  }, [id, setSessionActive]);

  const exerciseNames = useMemo(() => {
    const map = new Map<UUID, string>();
    for (const e of exercisesQ.data ?? []) map.set(e.id, e.name);
    return map;
  }, [exercisesQ.data]);

  const templateExercises = templateQ.data?.exercises ?? [];

  const suggestionQueries = useQueries({
    queries: templateExercises.map((te) => ({
      queryKey: ["suggest", te.exercise_id, te.id],
      queryFn: () => api.sessions.suggest(te.exercise_id, te.id!),
      enabled: !!te.id,
      staleTime: Infinity,
    })),
  });

  const suggestionByExercise = useMemo(() => {
    const map = new Map<UUID, Suggestion>();
    templateExercises.forEach((te, i) => {
      const s = suggestionQueries[i]?.data;
      if (s) map.set(te.exercise_id, s);
    });
    return map;
  }, [templateExercises, suggestionQueries]);

  // Build rows from template + logged sets.
  useEffect(() => {
    if (!sessionQ.data) return;
    const targets = templateQ.data?.exercises ?? [];
    const nameOf = (eid: UUID) => exerciseNames.get(eid) ?? "Exercise";

    const grouped = new Map<UUID, ExerciseRow>();

    for (const t of targets) {
      const suggestion = suggestionByExercise.get(t.exercise_id);
      grouped.set(t.exercise_id, {
        exerciseId: t.exercise_id,
        name: nameOf(t.exercise_id),
        orderIdx: t.order_idx,
        target: t,
        logged: [],
        suggestion,
        drafts: Array.from({ length: t.target_sets }, (_, i) => ({
          weight: i === 0 && suggestion && suggestion.weight_kg > 0 ? String(suggestion.weight_kg) : "",
          reps: "",
          rpe: "",
        })),
      });
    }

    for (const s of sessionQ.data.sets) {
      let row = grouped.get(s.exercise_id);
      if (!row) {
        row = {
          exerciseId: s.exercise_id,
          name: nameOf(s.exercise_id),
          orderIdx: s.order_idx,
          logged: [],
          drafts: [],
        };
        grouped.set(s.exercise_id, row);
      }
      row.logged.push(s);
    }

    // Populate drafts from logged sets so they render as done.
    for (const row of grouped.values()) {
      row.logged.sort((a, b) => a.set_number - b.set_number);
      row.logged.forEach((s, i) => {
        if (!row.drafts[i]) {
          row.drafts[i] = { weight: "", reps: "", rpe: "" };
        }
        row.drafts[i].weight = String(s.weight_kg);
        row.drafts[i].reps = String(s.reps);
        row.drafts[i].rpe = s.rpe != null ? String(s.rpe) : "";
        row.drafts[i].loggedId = s.id;
      });
    }

    setRows(
      Array.from(grouped.values()).sort((a, b) => a.orderIdx - b.orderIdx),
    );
  }, [sessionQ.data, templateQ.data, exerciseNames, suggestionByExercise]);

  const addSetMutation = useMutation({
    mutationFn: (args: {
      exerciseId: UUID;
      orderIdx: number;
      setNumber: number;
      weight: number;
      reps: number;
      rpe: number | null;
    }) =>
      api.sessions.addSet(id!, {
        exercise_id: args.exerciseId,
        order_idx: args.orderIdx,
        set_number: args.setNumber,
        weight_kg: args.weight,
        reps: args.reps,
        rpe: args.rpe ?? undefined,
      }),
    onSuccess: (loggedSet, args) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.exerciseId !== args.exerciseId) return r;
          const drafts = [...r.drafts];
          const idx = args.setNumber - 1;
          if (drafts[idx]) drafts[idx] = { ...drafts[idx], loggedId: loggedSet.id };
          return { ...r, logged: [...r.logged, loggedSet], drafts };
        }),
      );
      const restSec = rows.find((r) => r.exerciseId === args.exerciseId)?.target?.rest_seconds;
      if (restSec) startRest(restSec);
      qc.invalidateQueries({ queryKey: ["session", id] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => api.sessions.complete(id!, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.back();
    },
  });

  const updateDraft = (
    exerciseId: UUID,
    idx: number,
    field: "weight" | "reps" | "rpe",
    v: string,
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.exerciseId !== exerciseId) return r;
        const drafts = [...r.drafts];
        drafts[idx] = { ...drafts[idx], [field]: v };
        return { ...r, drafts };
      }),
    );
  };

  const copyPrev = (exerciseId: UUID, idx: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.exerciseId !== exerciseId) return r;
        const source = r.drafts[idx - 1] ?? r.drafts.slice().reverse().find((d) => d.weight);
        if (!source) return r;
        const drafts = [...r.drafts];
        drafts[idx] = { ...drafts[idx], weight: source.weight, reps: source.reps };
        return { ...r, drafts };
      }),
    );
  };

  const logSet = (exerciseId: UUID, idx: number) => {
    const row = rows.find((r) => r.exerciseId === exerciseId);
    if (!row) return;
    const draft = row.drafts[idx];
    const weight = parseFloat(draft.weight);
    const reps = parseInt(draft.reps, 10);
    if (isNaN(weight) || isNaN(reps)) {
      Alert.alert("Missing values", "Weight and reps are required.");
      return;
    }
    const rpe = draft.rpe.trim() === "" ? null : parseFloat(draft.rpe);
    addSetMutation.mutate({
      exerciseId,
      orderIdx: row.orderIdx,
      setNumber: idx + 1,
      weight,
      reps,
      rpe: rpe != null && !isNaN(rpe) ? rpe : null,
    });
  };

  const addExtraSet = (exerciseId: UUID) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.exerciseId !== exerciseId) return r;
        return {
          ...r,
          drafts: [...r.drafts, { weight: "", reps: "", rpe: "" }],
        };
      }),
    );
  };

  if (sessionQ.isLoading || exercisesQ.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.accent} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    );
  }

  if (!sessionQ.data) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Session not found.</Text>
      </SafeAreaView>
    );
  }

  const completed = !!sessionQ.data.completed_at;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <RestTimer />

        {rows.length === 0 ? (
          <Text style={styles.hint}>
            Blank session — add sets by picking exercises. (Exercise picker coming in Phase 3.)
          </Text>
        ) : (
          rows.map((r) => (
            <View key={r.exerciseId} style={styles.exerciseCard}>
              <View style={styles.exerciseHead}>
                <Text style={styles.exerciseName}>{r.name}</Text>
                {r.target && (
                  <Text style={styles.exerciseTarget}>
                    {r.target.target_sets}×{r.target.target_reps_low}-{r.target.target_reps_high}
                    {r.target.target_rpe ? ` @ RPE ${r.target.target_rpe}` : ""}
                  </Text>
                )}
                {r.suggestion && (
                  <Text style={styles.suggestionHint}>
                    {r.suggestion.weight_kg > 0
                      ? `↑ ${r.suggestion.weight_kg} kg — ${r.suggestion.reason}`
                      : r.suggestion.reason}
                  </Text>
                )}
              </View>

              {r.drafts.map((d, idx) => (
                <View key={idx} style={styles.setRowWrap}>
                  <SetRow
                    setNumber={idx + 1}
                    weight={d.weight}
                    reps={d.reps}
                    rpe={d.rpe}
                    onChangeWeight={(v) => updateDraft(r.exerciseId, idx, "weight", v)}
                    onChangeReps={(v) => updateDraft(r.exerciseId, idx, "reps", v)}
                    onChangeRpe={(v) => updateDraft(r.exerciseId, idx, "rpe", v)}
                    onLog={() => logSet(r.exerciseId, idx)}
                    logged={!!d.loggedId}
                    disabled={completed}
                  />
                  {!d.loggedId && !completed && (
                    <Pressable onPress={() => copyPrev(r.exerciseId, idx)} style={styles.copyBtn}>
                      <Text style={styles.copyLabel}>↺ Same as previous</Text>
                    </Pressable>
                  )}
                </View>
              ))}

              {!completed && (
                <Pressable
                  onPress={() => addExtraSet(r.exerciseId)}
                  style={({ pressed }) => [styles.addSetBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.addSetLabel}>+ Add another set</Text>
                </Pressable>
              )}
            </View>
          ))
        )}

        {!completed && (
          <Pressable
            onPress={() => completeMutation.mutate()}
            style={({ pressed }) => [styles.completeBtn, pressed && styles.pressed]}
          >
            <Text style={styles.completeLabel}>
              {completeMutation.isPending ? "Finishing..." : "Complete session"}
            </Text>
          </Pressable>
        )}
        {completed && <Text style={styles.hint}>Session completed at {sessionQ.data.completed_at}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  exerciseCard: {
    backgroundColor: theme.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  exerciseHead: { marginBottom: spacing.xs },
  exerciseName: { color: theme.text, fontSize: 18, fontWeight: "700" },
  exerciseTarget: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  suggestionHint: { color: theme.accent, fontSize: 11, marginTop: 4, opacity: 0.85 },
  setRowWrap: { gap: 2 },
  copyBtn: { alignSelf: "flex-start", paddingVertical: 2 },
  copyLabel: { color: theme.textMuted, fontSize: 11 },
  addSetBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    borderStyle: "dashed",
  },
  addSetLabel: { color: theme.textMuted, fontSize: 13 },
  completeBtn: {
    backgroundColor: theme.accent,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  completeLabel: { color: theme.bg, fontWeight: "700", fontSize: 16 },
  pressed: { opacity: 0.85 },
  hint: { color: theme.textMuted, fontSize: 14, textAlign: "center" },
  error: { color: theme.danger, textAlign: "center", marginTop: spacing.xl },
});
