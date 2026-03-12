import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useAllocationStore } from '@/store/allocation';
import { usePortfolioStore } from '@/store/portfolio';
import { useBrokerStore } from '@/store/broker';
import { AllocationChart } from '@/components/AllocationChart';
import { OrderConfirmModal } from '@/components/OrderConfirmModal';
import { useRebalance } from '@/features/allocation/hooks';
import { validateAllocation } from '@/features/allocation/engine';
import { formatKRW, formatPercent } from '@/utils/format';

export default function AllocationScreen() {
  const { config, addItem, removeItem, updateItem, loadConfig } = useAllocationStore();
  const { balance, holdings } = usePortfolioStore();
  const broker = useBrokerStore((s) => s.broker);

  const { result, isCalculating, isExecuting, error, orderResults, calculate, execute } =
    useRebalance();

  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newRatio, setNewRatio] = useState('');
  const [newType, setNewType] = useState<'stock' | 'etf' | 'cash'>('stock');

  useEffect(() => {
    loadConfig();
  }, []);

  const validation = validateAllocation(config.items);

  const handleRebalanceCheck = async () => {
    if (!validation.valid) {
      Alert.alert('비율 오류', validation.message ?? '비율 합계가 100%가 되어야 합니다.');
      return;
    }
    await calculate();
  };

  const handleExecute = () => {
    if (!result || result.orders.length === 0) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    await execute();
  };

  const handleAddItem = async () => {
    if (!newCode.trim() || !newName.trim() || !newRatio.trim()) {
      Alert.alert('입력 오류', '코드, 종목명, 비율을 모두 입력해주세요.');
      return;
    }
    const ratio = parseFloat(newRatio);
    if (isNaN(ratio) || ratio <= 0) {
      Alert.alert('입력 오류', '올바른 비율을 입력해주세요.');
      return;
    }
    await addItem({
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      targetRatio: ratio,
      type: newType,
    });
    setNewCode('');
    setNewName('');
    setNewRatio('');
    setShowAddModal(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>동적 자산배분</Text>
        <Text style={styles.subtitle}>목표 비율을 설정하고 리밸런싱하세요</Text>
      </View>

      {/* 차트 */}
      {result && result.statuses.length > 0 ? (
        <View style={styles.card}>
          <AllocationChart statuses={result.statuses} />
        </View>
      ) : null}

      {/* 설정 목록 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>목표 배분</Text>
          <View style={[styles.badge, validation.valid ? styles.badgeOk : styles.badgeError]}>
            <Text style={styles.badgeText}>
              {validation.total.toFixed(1)}%
            </Text>
          </View>
        </View>

        {config.items.length === 0 ? (
          <Text style={styles.emptyText}>아직 설정된 종목이 없습니다</Text>
        ) : (
          config.items.map((item) => (
            <View key={item.code} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemCode}>{item.code}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemRatio}>{item.targetRatio}%</Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('삭제', `${item.name}을 삭제하시겠습니까?`, [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: () => removeItem(item.code) },
                    ])
                  }
                >
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addBtnText}>+ 종목 추가</Text>
        </TouchableOpacity>
      </View>

      {/* 리밸런싱 결과 */}
      {result && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>리밸런싱 분석</Text>
          {result.needsRebalance ? (
            <>
              <Text style={styles.alertText}>
                ⚠️ {result.statuses.filter((s) => s.needsRebalance).length}개 종목 리밸런싱 필요
              </Text>
              {result.orders.map((order) => (
                <View key={`${order.code}-${order.type}`} style={styles.orderRow}>
                  <Text style={styles.orderName}>{order.name}</Text>
                  <Text
                    style={[
                      styles.orderType,
                      { color: order.type === 'buy' ? '#ef4444' : '#3b82f6' },
                    ]}
                  >
                    {order.type === 'buy' ? '매수' : '매도'} {order.quantity}주 ({formatKRW(order.estimatedAmount)})
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.okText}>✅ 모든 종목이 목표 비율 내에 있습니다</Text>
          )}
        </View>
      )}

      {/* 주문 실행 결과 */}
      {orderResults.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>주문 결과</Text>
          {orderResults.map((r) => (
            <View key={r.code} style={styles.resultRow}>
              <Text style={styles.resultName}>{r.name}</Text>
              <Text style={{ color: r.success ? '#16a34a' : '#dc2626' }}>
                {r.success ? '✅ 성공' : `❌ ${r.message}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 액션 버튼들 */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.analyzeBtn, isCalculating && styles.disabled]}
          onPress={handleRebalanceCheck}
          disabled={isCalculating || config.items.length === 0}
        >
          {isCalculating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeBtnText}>리밸런싱 분석</Text>
          )}
        </TouchableOpacity>

        {result?.needsRebalance && (
          <TouchableOpacity
            style={[styles.executeBtn, isExecuting && styles.disabled]}
            onPress={handleExecute}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.executeBtnText}>주문 실행</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* 종목 추가 모달 */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>종목 추가</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="종목 코드 (예: 005930)"
              value={newCode}
              onChangeText={setNewCode}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="종목명 (예: 삼성전자)"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="목표 비율 (예: 40)"
              value={newRatio}
              onChangeText={setNewRatio}
              keyboardType="numeric"
            />

            <View style={styles.typeRow}>
              {(['stock', 'etf', 'cash'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, newType === t && styles.typeBtnActive]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={[styles.typeBtnText, newType === t && styles.typeBtnTextActive]}>
                    {t === 'stock' ? '주식' : t === 'etf' ? 'ETF' : '현금'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleAddItem}>
                <Text style={styles.modalConfirmText}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 주문 확인 모달 */}
      <OrderConfirmModal
        visible={showConfirm}
        orders={result?.orders ?? []}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 24, paddingTop: 56, backgroundColor: '#1a1a2e' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeOk: { backgroundColor: '#d1fae5' },
  badgeError: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  emptyText: { color: '#9ca3af', textAlign: 'center', paddingVertical: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemLeft: {},
  itemCode: { fontSize: 12, color: '#6b7280' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  itemRatio: { fontSize: 16, fontWeight: '700', color: '#4f46e5' },
  deleteBtn: { fontSize: 16, color: '#9ca3af', paddingHorizontal: 4 },
  addBtn: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#4f46e5' },
  alertText: { fontSize: 14, color: '#d97706', marginBottom: 12 },
  okText: { fontSize: 14, color: '#16a34a' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  orderName: { fontSize: 14, color: '#374151' },
  orderType: { fontSize: 14, fontWeight: '600' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  resultName: { fontSize: 14, color: '#374151' },
  actions: { padding: 16, gap: 10 },
  analyzeBtn: { backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  analyzeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  executeBtn: { backgroundColor: '#dc2626', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  executeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  disabled: { opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#111827' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  typeBtnTextActive: { color: '#fff' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center' },
  modalConfirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
