import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBrokerStore } from '@/store/broker';
import { ETFInfo } from '@/brokers/types';
import { PriceDisplay } from '@/components/PriceDisplay';
import { formatKRW, formatNumber, formatLargeNumber, formatPercent } from '@/utils/format';

export default function ETFDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const broker = useBrokerStore((s) => s.broker);

  const [info, setInfo] = useState<ETFInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!broker || !code) return;

    setIsLoading(true);
    broker
      .getETFInfo(code)
      .then(setInfo)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [broker, code]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error || !info) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '정보를 불러올 수 없습니다'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>뒤로가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const summaryItems = [
    { label: 'NAV', value: formatKRW(info.nav) },
    { label: 'NAV 괴리율', value: formatPercent(info.navDiff) },
    { label: '기초지수', value: info.baseIndex || '-' },
    { label: '운용보수', value: `${info.expense.toFixed(4)}%` },
    { label: '순자산 총액', value: formatLargeNumber(info.totalAsset) },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{info.code}</Text>
            <View style={styles.etfBadge}>
              <Text style={styles.etfBadgeText}>ETF</Text>
            </View>
          </View>
          <Text style={styles.name}>{info.name}</Text>
        </View>
      </View>

      <View style={styles.priceSection}>
        <PriceDisplay
          price={info.currentPrice}
          changeAmount={info.changeAmount}
          changeRate={info.changeRate}
          size="large"
        />
      </View>

      <View style={styles.infoCard}>
        {summaryItems.map((item, idx) => (
          <View
            key={item.label}
            style={[styles.infoRow, idx < summaryItems.length - 1 && styles.infoRowBorder]}
          >
            <Text style={styles.infoLabel}>{item.label}</Text>
            <Text style={styles.infoValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {info.components.length > 0 && (
        <View style={styles.compCard}>
          <Text style={styles.compTitle}>구성 종목 TOP {info.components.length}</Text>
          {info.components.map((comp, idx) => (
            <View
              key={comp.code}
              style={[styles.compRow, idx < info.components.length - 1 && styles.compRowBorder]}
            >
              <View style={styles.compRank}>
                <Text style={styles.compRankText}>{idx + 1}</Text>
              </View>
              <View style={styles.compInfo}>
                <Text style={styles.compCode}>{comp.code}</Text>
                <Text style={styles.compName}>{comp.name}</Text>
              </View>
              <Text style={styles.compWeight}>{comp.weight.toFixed(2)}%</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 15, color: '#dc2626', marginBottom: 16 },
  backBtn: { backgroundColor: '#4f46e5', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  back: { padding: 4 },
  backIcon: { fontSize: 32, color: '#fff', fontWeight: '300' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  code: { fontSize: 13, color: '#9ca3af' },
  etfBadge: { backgroundColor: '#d1fae5', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  etfBadgeText: { fontSize: 11, fontWeight: '700', color: '#065f46' },
  name: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
  priceSection: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'flex-start',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  compCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  compTitle: { fontSize: 15, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 8 },
  compRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  compRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  compRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  compRankText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  compInfo: { flex: 1 },
  compCode: { fontSize: 12, color: '#9ca3af' },
  compName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  compWeight: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
});
