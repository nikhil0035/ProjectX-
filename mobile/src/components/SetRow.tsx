import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { radius, spacing, theme } from "@/lib/theme";

interface Props {
  setNumber: number;
  weight: string;
  reps: string;
  rpe: string;
  onChangeWeight: (v: string) => void;
  onChangeReps: (v: string) => void;
  onChangeRpe: (v: string) => void;
  onLog: () => void;
  logged: boolean;
  disabled?: boolean;
}

export function SetRow({
  setNumber,
  weight,
  reps,
  rpe,
  onChangeWeight,
  onChangeReps,
  onChangeRpe,
  onLog,
  logged,
  disabled,
}: Props) {
  return (
    <View style={[styles.row, logged && styles.rowDone]}>
      <Text style={styles.setNum}>#{setNumber}</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>kg</Text>
        <TextInput
          value={weight}
          onChangeText={onChangeWeight}
          keyboardType="decimal-pad"
          style={styles.input}
          selectTextOnFocus
          editable={!logged && !disabled}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>reps</Text>
        <TextInput
          value={reps}
          onChangeText={onChangeReps}
          keyboardType="number-pad"
          style={styles.input}
          selectTextOnFocus
          editable={!logged && !disabled}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>RPE</Text>
        <TextInput
          value={rpe}
          onChangeText={onChangeRpe}
          keyboardType="decimal-pad"
          style={styles.input}
          selectTextOnFocus
          editable={!logged && !disabled}
          placeholder="—"
          placeholderTextColor={theme.textMuted}
        />
      </View>

      <Pressable
        onPress={onLog}
        disabled={logged || disabled}
        style={({ pressed }) => [
          styles.logBtn,
          logged ? styles.logBtnDone : null,
          pressed && !logged && styles.pressed,
        ]}
      >
        <Text style={[styles.logLabel, logged && styles.logLabelDone]}>
          {logged ? "✓" : "Log"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowDone: { opacity: 0.55 },
  setNum: {
    color: theme.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    width: 24,
    paddingBottom: 10,
  },
  field: { flex: 1, gap: 2 },
  fieldLabel: {
    color: theme.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: theme.bgElevated,
    color: theme.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  logBtn: {
    backgroundColor: theme.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
    minWidth: 56,
    alignItems: "center",
  },
  logBtnDone: { backgroundColor: theme.accentDim },
  logLabel: { color: theme.bg, fontWeight: "700" },
  logLabelDone: { color: theme.text },
  pressed: { opacity: 0.85 },
});
