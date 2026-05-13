import React, { useEffect, useRef, useState } from "react";
import { Animated, View, Text, StyleSheet } from "react-native";
import printQueueManager from "../Utils/PrintQueueManager";

const QueueMonitorBadge = () => {
  const [counts, setCounts] = useState(printQueueManager.getAllQueueLengths());
  const scale = useRef(new Animated.Value(1)).current;
  const total = counts.kot + counts.bill;

  useEffect(() => {
    const unsubscribe = printQueueManager.subscribe(next => {
      setCounts(next);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!total) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [total, scale]);

  if (!total) {
    return null;
  }

  return (
    <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
      <Text style={styles.text}>Q:{total}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#fff",
    borderRadius: 10,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111",
  },
});

export default QueueMonitorBadge;
