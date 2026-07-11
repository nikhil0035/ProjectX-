import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { radius, spacing, theme } from "@/lib/theme";
import { useAuth } from "@/stores/auth";

export default function SettingsScreen() {
  const email = useAuth((s) => s.email);
  const logout = useAuth((s) => s.logout);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{email ?? "—"}</Text>
        </View>

        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        >
          <Text style={styles.logoutLabel}>Log out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: theme.text, fontSize: 24, fontWeight: "700" },
  card: {
    backgroundColor: theme.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  label: { color: theme.textMuted, fontSize: 11, letterSpacing: 1 },
  value: { color: theme.text, fontSize: 16, marginTop: 4 },
  logout: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.danger,
    alignItems: "center",
  },
  logoutLabel: { color: theme.danger, fontWeight: "600" },
  pressed: { opacity: 0.75 },
});
