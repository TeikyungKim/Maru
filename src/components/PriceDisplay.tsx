import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatKRW, formatPercent, getPriceColor } from '../utils/format';

interface PriceDisplayProps {
  price: number;
  changeAmount?: number;
  changeRate?: number;
  size?: 'small' | 'medium' | 'large';
}

export function PriceDisplay({
  price,
  changeAmount,
  changeRate,
  size = 'medium',
}: PriceDisplayProps) {
  const color = getPriceColor(changeRate ?? changeAmount ?? 0);
  const fontSizes = { small: 14, medium: 20, large: 28 };
  const fontSize = fontSizes[size];

  return (
    <View style={styles.container}>
      <Text style={[styles.price, { fontSize, color }]}>
        {formatKRW(price)}
      </Text>
      {(changeAmount !== undefined || changeRate !== undefined) && (
        <View style={styles.row}>
          {changeAmount !== undefined && (
            <Text style={[styles.change, { color }]}>
              {changeAmount >= 0 ? '+' : ''}
              {formatKRW(changeAmount)}
            </Text>
          )}
          {changeRate !== undefined && (
            <Text style={[styles.change, { color }]}>
              {' '}({formatPercent(changeRate)})
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-end' },
  price: { fontWeight: '700' },
  row: { flexDirection: 'row', marginTop: 2 },
  change: { fontSize: 13 },
});
