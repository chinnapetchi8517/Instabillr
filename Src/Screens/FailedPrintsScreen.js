import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getFailedPrintStats, retryAllFailedPrints } from "../Services/PrintRecoveryService";
import colors from "../Utils/colors";

const FailedPrintsScreen = () => {
  const [stats, setStats] = useState({ kot: 0, bill: 0, total: 0 });
  const [retrying, setRetrying] = useState(false);

  const loadStats = async () => {
    const next = await getFailedPrintStats();
    setStats(next);
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const handleRetryAll = async () => {
    try {
      setRetrying(true);
      await retryAllFailedPrints();
      await loadStats();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Failed Print Recovery</Text>
      <Text style={styles.card}>KOT failed jobs: {stats.kot}</Text>
      <Text style={styles.card}>Bill failed jobs: {stats.bill}</Text>
      <Text style={styles.card}>Total failed jobs: {stats.total}</Text>

      <TouchableOpacity
        style={[styles.button, retrying && styles.disabled]}
        onPress={handleRetryAll}
        disabled={retrying}
      >
        <Text style={styles.buttonText}>{retrying ? "Retrying..." : "Retry All Failed Prints"}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default FailedPrintsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111",
  },
  card: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
  },
  button: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.6,
  },
});
