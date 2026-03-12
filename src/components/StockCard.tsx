import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { SearchResult, Holding } from '../brokers/types';
import { PriceDisplay } from './PriceDisplay';
import { formatKRW } from '../utils/format';

type StockCardProps =
  | { mode: 'search'; item: SearchResult; onPress: () => void }
  | { mode: 'holding'; item: Holding; onPress?: () => void; onLongPress?: () => void };

export function StockCard(props: StockCardProps) {
  if (props.mode === 'search') {
    const { item, onPress } = props;
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.left}>
          <Text style={styles.code}>{item.code}</Text>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.badge, item.type === 'etf' ? styles.etfBadge : styles.stockBadge]}>
            <Text style={styles.badgeText}>{item.type === 'etf' ? 'ETF' : '주식'}</Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.market}>{item.market}</Text>
          {item.currentPrice !== undefined && (
            <PriceDisplay
              price={item.currentPrice}
              changeRate={item.changeRate}
              size="small"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  const { item, onPress, onLongPress } = props;
  const evalColor = item.profitLoss >= 0 ? '#ef4444' : '#3b82f6';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={styles.code}>{item.code}</Text>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.qty}>{item.quantity}주 · 평균 {formatKRW(item.avgPrice)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.evalAmount}>{formatKRW(item.evalAmount)}</Text>
        <Text style={[styles.profitLoss, { color: evalColor }]}>
          {item.profitLoss >= 0 ? '+' : ''}{formatKRW(item.profitLoss)}
          {' '}({item.profitLossRate >= 0 ? '+' : ''}{item.profitLossRate.toFixed(2)}%)
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  left: { flex: 1 },
  right: { alignItems: 'flex-end' },
  code: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  name: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },
  market: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  qty: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  evalAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  profitLoss: { fontSize: 13, marginTop: 2 },
  badge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  stockBadge: { backgroundColor: '#dbeafe' },
  etfBadge: { backgroundColor: '#d1fae5' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },
});
