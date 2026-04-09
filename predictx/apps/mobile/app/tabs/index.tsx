import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

const MOCK_MARKETS = [
  { id: "1", question: "Will Bitcoin exceed $120,000 before end of July 2025?", category: "crypto", yesProbability: 62, totalVolume: 342000 },
  { id: "2", question: "Will the Federal Reserve cut rates at the September 2025 FOMC meeting?", category: "politics", yesProbability: 38, totalVolume: 195000 },
  { id: "3", question: "Will Ethereum ETF net inflows exceed $1B in a single week in Q3 2025?", category: "crypto", yesProbability: 47, totalVolume: 127000 },
  { id: "4", question: "Will Manchester City win the 2025-26 Premier League title?", category: "sports", yesProbability: 29, totalVolume: 88000 },
  { id: "5", question: "Will Apple release a foldable iPhone in 2025?", category: "tech", yesProbability: 14, totalVolume: 61000 },
];

const CATEGORY_COLORS: Record<string, string> = {
  crypto: "#f59e0b", sports: "#3b82f6", politics: "#ef4444", tech: "#a855f7", other: "#6b7280",
};

export default function MarketsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_MARKETS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Markets</Text>
            <Text style={styles.subtitle}>Trade on what happens next</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(`/market/${item.id}`)}
          >
            {/* Category badge */}
            <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[item.category] + "20" }]}>
              <Text style={[styles.badgeText, { color: CATEGORY_COLORS[item.category] }]}>
                {item.category}
              </Text>
            </View>

            {/* Question */}
            <Text style={styles.question} numberOfLines={2}>{item.question}</Text>

            {/* Probability bar */}
            <View style={styles.barContainer}>
              <View style={[styles.barFill, { width: `${item.yesProbability}%` }]} />
            </View>

            <View style={styles.row}>
              <View style={styles.probRow}>
                <Text style={styles.yesText}>{item.yesProbability}%</Text>
                <Text style={styles.labelText}> YES</Text>
              </View>
              <View style={styles.probRow}>
                <Text style={styles.labelText}>NO </Text>
                <Text style={styles.noText}>{100 - item.yesProbability}%</Text>
              </View>
            </View>

            {/* Footer */}
            <View style={[styles.row, styles.footer]}>
              <Text style={styles.volText}>${item.totalVolume.toLocaleString()} vol</Text>
              <View style={styles.btnRow}>
                <Pressable style={styles.btnYes}>
                  <Text style={styles.btnYesText}>YES {item.yesProbability}¢</Text>
                </Pressable>
                <Pressable style={styles.btnNo}>
                  <Text style={styles.btnNoText}>NO {100 - item.yesProbability}¢</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#0a0a0f" },
  list:        { padding: 16, paddingBottom: 40 },
  header:      { marginBottom: 20 },
  title:       { fontSize: 32, fontWeight: "400", color: "#fff", letterSpacing: -0.5 },
  subtitle:    { fontSize: 14, color: "#6b7280", marginTop: 4 },
  card:        { backgroundColor: "#111118", borderRadius: 16, borderWidth: 1, borderColor: "#2a2a35", padding: 16, marginBottom: 12 },
  badge:       { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 12 },
  badgeText:   { fontSize: 11, fontWeight: "600" },
  question:    { fontSize: 16, color: "#fff", fontWeight: "500", lineHeight: 22, marginBottom: 16 },
  barContainer:{ height: 6, backgroundColor: "#2a2a35", borderRadius: 3, overflow: "hidden", marginBottom: 8 },
  barFill:     { height: "100%", backgroundColor: "#22c55e", borderRadius: 3 },
  row:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  probRow:     { flexDirection: "row", alignItems: "baseline" },
  yesText:     { fontSize: 14, color: "#22c55e", fontWeight: "700" },
  noText:      { fontSize: 14, color: "#ef4444", fontWeight: "700" },
  labelText:   { fontSize: 12, color: "#6b7280" },
  footer:      { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#202028" },
  volText:     { fontSize: 12, color: "#6b7280" },
  btnRow:      { flexDirection: "row", gap: 8 },
  btnYes:      { backgroundColor: "rgba(34,197,94,0.12)", borderWidth: 1, borderColor: "rgba(34,197,94,0.25)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  btnYesText:  { fontSize: 11, color: "#22c55e", fontWeight: "700" },
  btnNo:       { backgroundColor: "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  btnNoText:   { fontSize: 11, color: "#ef4444", fontWeight: "700" },
});
