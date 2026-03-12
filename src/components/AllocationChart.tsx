import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { AllocationStatus } from '../features/allocation/types';
import { formatPercent } from '../utils/format';

const CHART_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#d97706',
  '#16a34a', '#0891b2', '#0284c7', '#6d28d9', '#be123c',
];

interface AllocationChartProps {
  statuses: AllocationStatus[];
}

export function AllocationChart({ statuses }: AllocationChartProps) {
  const screenWidth = Dimensions.get('window').width;

  const chartData = statuses.map((s, idx) => ({
    name: s.item.name,
    population: Math.max(s.currentRatio, 0.1),
    color: CHART_COLORS[idx % CHART_COLORS.length],
    legendFontColor: '#374151',
    legendFontSize: 12,
  }));

  if (chartData.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>자산배분 설정을 추가해주세요</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PieChart
        data={chartData}
        width={screenWidth - 32}
        height={200}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute={false}
      />
      <View style={styles.legend}>
        {statuses.map((s, idx) => (
          <View key={s.item.code} style={styles.legendRow}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] },
              ]}
            />
            <Text style={styles.legendName}>{s.item.name}</Text>
            <View style={styles.legendNumbers}>
              <Text style={styles.legendCurrent}>
                현재 {formatPercent(s.currentRatio, 1)}
              </Text>
              <Text style={styles.legendTarget}>
                목표 {formatPercent(s.item.targetRatio, 1)}
              </Text>
              {s.needsRebalance && (
                <Text style={styles.legendAlert}>⚠</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  empty: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  legend: { width: '100%', paddingHorizontal: 8, marginTop: 8 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendName: { flex: 1, fontSize: 14, color: '#374151' },
  legendNumbers: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendCurrent: { fontSize: 12, color: '#6b7280' },
  legendTarget: { fontSize: 12, color: '#4f46e5', fontWeight: '600' },
  legendAlert: { fontSize: 14 },
});
