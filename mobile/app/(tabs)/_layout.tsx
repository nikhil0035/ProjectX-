import { Tabs } from "expo-router";
import { Text } from "react-native";

import { theme } from "@/lib/theme";

function tabIcon(label: string, focused: boolean) {
  return (
    <Text
      style={{
        fontSize: 18,
        opacity: focused ? 1 : 0.55,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        tabBarStyle: { backgroundColor: theme.bgElevated, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => tabIcon("◎", focused),
        }}
      />
      <Tabs.Screen
        name="templates"
        options={{
          title: "Templates",
          tabBarIcon: ({ focused }) => tabIcon("≡", focused),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ focused }) => tabIcon("⧗", focused),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => tabIcon("⚙", focused),
        }}
      />
    </Tabs>
  );
}
