import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { WeekStrip } from "@/components/dashboard/WeekStrip";
import { radius, spacing, theme } from "@/lib/theme";

type Period = "day" | "week" | "month";

export default function DashboardScreen() {
  const [period, setPeriod] = useState<Period>("week");
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => api.dashboard.get(period),
  });

  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.templates.list(),
  });

  const startEmpty = async () => {
    const session = await api.sessions.start({});
    await qc.invalidateQueries({ queryKey: ["sessions"] });
    router.push(`/session/${session.id}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.accent}
          />
        }
      >
        <View style={styles.periodRow}>
          {(["day", "week", "month"] as Period[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.pill, period === p && styles.pillActive]}
            >
              <Text style={[styles.pillLabel, period === p && styles.pillLabelActive]}>
                {p.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: spacing.xl }} />
        ) : error ? (
          <Text style={styles.error}>Couldn't load dashboard.</Text>
        ) : data ? (
          <>
            <View style={styles.ringWrap}>
              <ScoreRing score={data.score} label={period.toUpperCase()} />
            </View>

            <View style={styles.statRow}>
              <Stat
                label="Sessions"
                value={`${data.sessions_completed} / ${data.sessions_planned}`}
              />
              <Stat label="Streak" value={`${data.streak_days_trained}d`} />
              <Stat
                label="Training"
                value={
                  data.sub_scores.training == null
                    ? "—"
                    : `${Math.round(data.sub_scores.training)}`
                }
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>This week</Text>
              <WeekStrip points={data.week_strip} />
            </View>
          </>
        ) : null}

        <View style={{ height: spacing.lg }} />

        <Text style={styles.section}>Start a session</Text>
        {templates.data && templates.data.length > 0 ? (
          templates.data.map((t) => (
            <Pressable
              key={t.id}
              onPress={async () => {
                const s = await api.sessions.start({ template_id: t.id });
                await qc.invalidateQueries({ queryKey: ["sessions"] });
                router.push(`/session/${s.id}`);
              }}
              style={({ pressed }) => [styles.templateCard, pressed && styles.pressed]}
            >
              <Text style={styles.templateName}>{t.name}</Text>
              <Text style={styles.templateMeta}>
                {t.exercises.length} exercise{t.exercises.length === 1 ? "" : "s"}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.hint}>
            No templates yet. Create one on the Templates tab, or start a blank session.
          </Text>
        )}

        <Pressable
          onPress={startEmpty}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          <Text style={styles.btnLabel}>+ Start blank session</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  periodRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "center" },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pillActive: { backgroundColor: theme.accentDim, borderColor: theme.accent },
  pillLabel: { color: theme.textMuted, fontSize: 12, letterSpacing: 1 },
  pillLabelActive: { color: theme.text, fontWeight: "600" },

  ringWrap: { alignItems: "center", marginVertical: spacing.lg },

  statRow: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: theme.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  statValue: { color: theme.text, fontSize: 20, fontWeight: "700" },
  statLabel: { color: theme.textMuted, fontSize: 11, marginTop: 2, letterSpacing: 1 },

  card: {
    backgroundColor: theme.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    gap: spacing.md,
  },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: "600" },

  section: {
    color: theme.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: spacing.md,
  },

  templateCard: {
    backgroundColor: theme.bgCard,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 2,
  },
  templateName: { color: theme.text, fontSize: 16, fontWeight: "600" },
  templateMeta: { color: theme.textMuted, fontSize: 12 },

  btn: {
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.accent,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  btnLabel: { color: theme.accent, fontWeight: "600" },

  pressed: { opacity: 0.75 },
  hint: { color: theme.textMuted, fontSize: 14 },
  error: { color: theme.danger },
});
