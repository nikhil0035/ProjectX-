import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/lib/theme";

interface Props {
  score: number | null;
  label?: string;
  size?: number;
}

export function ScoreRing({ score, label, size = 160 }: Props) {
  const percent = score ?? 0;
  const ringColor = score == null ? theme.border : theme.accent;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
            opacity: score == null ? 0.35 : Math.max(0.35, percent / 100),
          },
        ]}
      />
      <View style={styles.inner}>
        <Text style={styles.value}>{score == null ? "—" : Math.round(score)}</Text>
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 8,
  },
  inner: { alignItems: "center", justifyContent: "center" },
  value: { color: theme.text, fontSize: 44, fontWeight: "800" },
  label: { color: theme.textMuted, fontSize: 12, marginTop: 4, letterSpacing: 1 },
});
