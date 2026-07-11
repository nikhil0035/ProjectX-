import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { radius, spacing, theme } from "@/lib/theme";
import { useAuth } from "@/stores/auth";

export default function LoginScreen() {
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, displayName.trim() || undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <Text style={styles.title}>ProjectX</Text>
        <Text style={styles.subtitle}>
          {mode === "login" ? "Log in" : "Create an account"}
        </Text>

        {mode === "register" && (
          <TextInput
            placeholder="Display name (optional)"
            placeholderTextColor={theme.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
            autoCapitalize="words"
          />
        )}

        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.textMuted}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Password (8+ chars)"
          placeholderTextColor={theme.textMuted}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={submitting || !email || password.length < 8}
          style={({ pressed }) => [
            styles.btn,
            (submitting || !email || password.length < 8) && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.bg} />
          ) : (
            <Text style={styles.btnLabel}>
              {mode === "login" ? "Log in" : "Create account"}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => setMode(mode === "login" ? "register" : "login")}
          style={styles.switchBtn}
        >
          <Text style={styles.switchLabel}>
            {mode === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Log in"}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: 32, fontWeight: "700", color: theme.text, textAlign: "center" },
  subtitle: {
    fontSize: 16,
    color: theme.textMuted,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  input: {
    backgroundColor: theme.bgElevated,
    color: theme.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    fontSize: 16,
  },
  error: { color: theme.danger, fontSize: 14 },
  btn: {
    backgroundColor: theme.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  btnLabel: { color: theme.bg, fontWeight: "700", fontSize: 16 },
  switchBtn: { alignItems: "center", paddingVertical: spacing.md },
  switchLabel: { color: theme.textMuted, fontSize: 14 },
});
