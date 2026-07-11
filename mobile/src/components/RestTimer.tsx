import { Pressable, StyleSheet, Text, View } from "react-native";

import { useCountdown } from "@/hooks/useCountdown";
import { radius, spacing, theme } from "@/lib/theme";
import { useActiveSession } from "@/stores/activeSession";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RestTimer() {
  const endsAt = useActiveSession((s) => s.restEndsAt);
  const clearRest = useActiveSession((s) => s.clearRest);
  const startRest = useActiveSession((s) => s.startRest);
  const remaining = useCountdown(endsAt);

  if (!endsAt || remaining <= 0) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.label}>Rest</Text>
      <Text style={styles.time}>{fmt(remaining)}</Text>
      <View style={styles.actions}>
        <Pressable onPress={() => startRest(30)} style={styles.chip}>
          <Text style={styles.chipLabel}>+30s</Text>
        </Pressable>
        <Pressable onPress={clearRest} style={[styles.chip, styles.chipDanger]}>
          <Text style={styles.chipLabel}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: theme.accentDim,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  label: { color: theme.text, fontSize: 12, letterSpacing: 1 },
  time: {
    color: theme.text,
    fontSize: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    flex: 1,
  },
  actions: { flexDirection: "row", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: theme.bg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipDanger: { borderColor: theme.danger },
  chipLabel: { color: theme.text, fontSize: 12 },
});
