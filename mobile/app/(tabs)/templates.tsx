import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/api/client";
import { radius, spacing, theme } from "@/lib/theme";

export default function TemplatesScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.templates.list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.templates.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Templates</Text>
        <Text style={styles.subtitle}>
          Full template editor lands in Phase 3. For now, create via API or seed data.
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No templates yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.exercises.length} exercise
                  {item.exercises.length === 1 ? "" : "s"}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert("Delete template?", item.name, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteMut.mutate(item.id),
                    },
                  ])
                }
                style={styles.trash}
              >
                <Text style={styles.trashLabel}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: { padding: spacing.lg, gap: 4 },
  title: { color: theme.text, fontSize: 24, fontWeight: "700" },
  subtitle: { color: theme.textMuted, fontSize: 13 },
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
  name: { color: theme.text, fontSize: 16, fontWeight: "600" },
  meta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  trash: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.danger,
  },
  trashLabel: { color: theme.danger, fontSize: 12, fontWeight: "600" },
});
