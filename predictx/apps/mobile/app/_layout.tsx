import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle:     { backgroundColor: "#111118" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "500" },
          contentStyle:    { backgroundColor: "#0a0a0f" },
        }}
      />
    </QueryClientProvider>
  );
}
