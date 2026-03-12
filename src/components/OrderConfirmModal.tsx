import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { RebalanceOrder } from '../features/allocation/types';
import { formatKRW, formatNumber } from '../utils/format';

interface OrderConfirmModalProps {
  visible: boolean;
  orders: RebalanceOrder[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function OrderConfirmModal({
  visible,
  orders,
  onConfirm,
  onCancel,
}: OrderConfirmModalProps) {
  const totalBuyAmount = orders
    .filter((o) => o.type === 'buy')
    .reduce((sum, o) => sum + o.estimatedAmount, 0);
  const totalSellAmount = orders
    .filter((o) => o.type === 'sell')
    .reduce((sum, o) => sum + o.estimatedAmount, 0);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>리밸런싱 주문 확인</Text>
          <Text style={styles.subtitle}>
            아래 주문이 시장가로 실행됩니다.
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {orders.map((order) => (
              <View
                key={`${order.code}-${order.type}`}
                style={[
                  styles.orderRow,
                  order.type === 'buy' ? styles.buyRow : styles.sellRow,
                ]}
              >
                <View>
                  <Text style={styles.orderCode}>{order.code}</Text>
                  <Text style={styles.orderName}>{order.name}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text
                    style={[
                      styles.orderType,
                      { color: order.type === 'buy' ? '#ef4444' : '#3b82f6' },
                    ]}
                  >
                    {order.type === 'buy' ? '매수' : '매도'}
                  </Text>
                  <Text style={styles.orderQty}>{formatNumber(order.quantity)}주</Text>
                  <Text style={styles.orderAmount}>{formatKRW(order.estimatedAmount)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>총 매도 예정</Text>
              <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>
                {formatKRW(totalSellAmount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>총 매수 예정</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                {formatKRW(totalBuyAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>주문 실행</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  scroll: { maxHeight: 300 },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  buyRow: { backgroundColor: '#fef2f2' },
  sellRow: { backgroundColor: '#eff6ff' },
  orderCode: { fontSize: 12, color: '#6b7280' },
  orderName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  orderRight: { alignItems: 'flex-end' },
  orderType: { fontSize: 14, fontWeight: '700' },
  orderQty: { fontSize: 13, color: '#374151' },
  orderAmount: { fontSize: 13, fontWeight: '600', color: '#111827' },
  summary: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 14, color: '#6b7280' },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
