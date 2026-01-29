import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

export default function RoutinesScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("routines.title")}</Text>
      <Text style={styles.placeholder}>
        Routines feature - create bedtime schedules with notifications
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 32,
  },
});
