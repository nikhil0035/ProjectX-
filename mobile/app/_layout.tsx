import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { theme } from "@/lib/theme";
import { useAuth } from "@/stores/auth";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function useAuthGate() {
  const loading = useAuth((s) => s.loading);
  const authenticated = useAuth((s) => s.authenticated);
  const hydrate = useAuth((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!authenticated && !inAuthGroup) {
      router.replace("/login");
    } else if (authenticated && inAuthGroup) {
      router.replace("/");
    }
  }, [loading, authenticated, segments, router]);

  return { loading };
}

export default function RootLayout() {
  const { loading } = useAuthGate();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="session/[id]" options={{ title: "Session" }} />
      </Stack>
    </QueryClientProvider>
  );
}
