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
import { StockInfo, StockPrice } from '@/brokers/types';
import { PriceDisplay } from '@/components/PriceDisplay';
import { formatKRW, formatNumber, formatPercent, formatLargeNumber } from '@/utils/format';

export default function StockDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const broker = useBrokerStore((s) => s.broker);

  const [info, setInfo] = useState<StockInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!broker || !code) return;

    setIsLoading(true);
    broker
      .getStockInfo(code)
      .then(setInfo)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));

    // 실시간 시세 구독
    if (broker.subscribePrice) {
      broker.subscribePrice(code, (price: StockPrice) => {
        setInfo((prev) =>
          prev
            ? {
                ...prev,
                currentPrice: price.currentPrice,
                changeAmount: price.changeAmount,
                changeRate: price.changeRate,
                volume: price.volume,
              }
            : prev
        );
      });
    }

    return () => {
      broker.unsubscribePrice?.(code);
    };
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

  const items = [
    { label: '시가', value: formatKRW(info.openPrice) },
    { label: '고가', value: formatKRW(info.highPrice) },
    { label: '저가', value: formatKRW(info.lowPrice) },
    { label: '거래량', value: formatNumber(info.volume) },
    { label: '시가총액', value: formatLargeNumber(info.marketCap) },
    { label: 'PER', value: info.per.toFixed(2) },
    { label: 'PBR', value: info.pbr.toFixed(2) },
    { label: 'EPS', value: formatKRW(info.eps) },
    { label: '52주 최고', value: formatKRW(info.week52High) },
    { label: '52주 최저', value: formatKRW(info.week52Low) },
    { label: '업종', value: info.sector || '-' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.code}>{info.code}</Text>
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
        {items.map((item, idx) => (
          <View
            key={item.label}
            style={[styles.infoRow, idx < items.length - 1 && styles.infoRowBorder]}
          >
            <Text style={styles.infoLabel}>{item.label}</Text>
            <Text style={styles.infoValue}>{item.value}</Text>
          </View>
        ))}
      </View>
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
  code: { fontSize: 13, color: '#9ca3af' },
  name: { fontSize: 20, fontWeight: '800', color: '#fff' },
  priceSection: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'flex-start',
  },
  infoCard: {
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
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
