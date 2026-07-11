import { StyleSheet, Text, View } from "react-native";

import { radius, spacing, theme } from "@/lib/theme";

import type { DailyPoint } from "@/api/types";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

export function WeekStrip({ points }: { points: DailyPoint[] }) {
  return (
    <View style={styles.row}>
      {points.map((p, idx) => {
        const trained = p.sessions > 0;
        return (
          <View key={p.day} style={styles.col}>
            <Text style={styles.dow}>{DOW[idx] ?? ""}</Text>
            <View style={[styles.dot, trained ? styles.dotOn : styles.dotOff]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  col: { alignItems: "center", gap: spacing.xs },
  dow: { color: theme.textMuted, fontSize: 11, letterSpacing: 1 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dotOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  dotOff: { backgroundColor: "transparent", borderColor: theme.border },
});
