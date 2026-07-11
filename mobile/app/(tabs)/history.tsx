import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { radius, spacing, theme } from "@/lib/theme";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "—";
  const min = Math.round(
    (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000,
  );
  return `${min} min`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.sessions.list(),
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No sessions logged yet.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/session/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.date}>{fmtDate(item.started_at)}</Text>
                <Text style={styles.meta}>
                  {item.sets.length} set{item.sets.length === 1 ? "" : "s"} ·{" "}
                  {fmtDuration(item.started_at, item.completed_at)}
                </Text>
              </View>
              <Text style={styles.status}>
                {item.completed_at ? "✓" : "…"}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: { padding: spacing.lg },
  title: { color: theme.text, fontSize: 24, fontWeight: "700" },
  list: { padding: spacing.lg, paddingTop: 0 },
  empty: { color: theme.textMuted, textAlign: "center", marginTop: spacing.xl },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    gap: spacing.md,
  },
  date: { color: theme.text, fontSize: 16, fontWeight: "600" },
  meta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  status: {
    color: theme.accent,
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  pressed: { opacity: 0.75 },
});
