import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useBrokerStore } from '@/store/broker';
import { usePortfolioStore } from '@/store/portfolio';
import { StockCard } from '@/components/StockCard';
import { formatKRW, formatPercent } from '@/utils/format';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();
  const broker = useBrokerStore((s) => s.broker);
  const { balance, holdings, isLoading, setBalance, setHoldings, setLoading, setError } =
    usePortfolioStore();

  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!broker) return;
    setLoading(true);
    try {
      const [bal, hold] = await Promise.all([
        broker.getAccountBalance(),
        broker.getHoldings(),
      ]);
      setBalance(bal);
      setHoldings(hold);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [broker]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const profitColor = (balance?.profitLoss ?? 0) >= 0 ? '#ef4444' : '#3b82f6';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐾 마루</Text>
      </View>

      {/* 총 자산 카드 */}
      <View style={styles.assetCard}>
        <Text style={styles.assetLabel}>총 자산</Text>
        <Text style={styles.assetValue}>{formatKRW(balance?.totalAsset ?? 0)}</Text>

        <View style={styles.assetRow}>
          <View style={styles.assetItem}>
            <Text style={styles.assetSubLabel}>평가손익</Text>
            <Text style={[styles.assetSubValue, { color: profitColor }]}>
              {balance ? formatKRW(balance.profitLoss) : '-'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.assetItem}>
            <Text style={styles.assetSubLabel}>수익률</Text>
            <Text style={[styles.assetSubValue, { color: profitColor }]}>
              {balance ? formatPercent(balance.profitLossRate) : '-'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.assetItem}>
            <Text style={styles.assetSubLabel}>예수금</Text>
            <Text style={styles.assetSubValue}>
              {balance ? formatKRW(balance.cashBalance) : '-'}
            </Text>
          </View>
        </View>
      </View>

      {/* 보유 종목 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>보유 종목</Text>
          <Text style={styles.sectionCount}>{holdings.length}종목</Text>
        </View>

        {holdings.length === 0 && !isLoading ? (
          <View style={styles.emptyHoldings}>
            <Text style={styles.emptyText}>보유 종목이 없습니다</Text>
          </View>
        ) : (
          holdings.map((holding) => (
            <StockCard
              key={holding.code}
              mode="holding"
              item={holding}
              onPress={() => router.push(`/(main)/stock/${holding.code}`)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  assetCard: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  assetLabel: { fontSize: 14, color: '#9ca3af', marginBottom: 8 },
  assetValue: { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 20 },
  assetRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
  },
  assetItem: { flex: 1, alignItems: 'center' },
  assetSubLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  assetSubValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  section: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sectionCount: { fontSize: 13, color: '#6b7280' },
  emptyHoldings: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});
