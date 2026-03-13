import { useEffect, useRef, useState } from 'react';
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
  Platform,
} from 'react-native';
import { useAllocationStore } from '@/store/allocation';
import { usePortfolioStore } from '@/store/portfolio';
import { useBrokerStore } from '@/store/broker';
import { AllocationChart } from '@/components/AllocationChart';
import { OrderConfirmModal } from '@/components/OrderConfirmModal';
import { useRebalance } from '@/features/allocation/hooks';
import { validateAllocation } from '@/features/allocation/engine';
import { formatKRW } from '@/utils/format';
import { SearchResult } from '@/brokers/types';

export default function AllocationScreen() {
  const { config, addItem, removeItem, loadConfig } = useAllocationStore();
  const { holdings: _holdings } = usePortfolioStore();
  const broker = useBrokerStore((s) => s.broker);

  const { result, isCalculating, isExecuting, orderResults, calculate, execute } =
    useRebalance();

  const showError = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newRatio, setNewRatio] = useState('');
  const [newType, setNewType] = useState<'stock' | 'etf' | 'cash'>('stock');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCodeValidated, setIsCodeValidated] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isCodeLooking, setIsCodeLooking] = useState(false);
  const [codeValidatedNoName, setCodeValidatedNoName] = useState(false);
  const [searchEmpty, setSearchEmpty] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const validation = validateAllocation(config.items);

  const handleRebalanceCheck = async () => {
    if (!validation.valid) {
      showError('비율 오류', validation.message ?? '비율 합계가 100%가 되어야 합니다.');
      return;
    }
    try {
      await calculate();
    } catch (e) {
      showError('분석 오류', (e as Error).message);
    }
  };

  const handleExecute = () => {
    if (!result || result.orders.length === 0) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    try {
      await execute();
    } catch (e) {
      showError('주문 오류', (e as Error).message);
    }
  };

  const handleDeleteItem = (code: string, name: string) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`${name}을(를) 삭제하시겠습니까?`)) {
        removeItem(code);
      }
    } else {
      Alert.alert('삭제', `${name}을(를) 삭제하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => removeItem(code) },
      ]);
    }
  };

  const handleCodeChange = (text: string) => {
    const code = text.toUpperCase();
    setNewCode(code);
    setIsCodeValidated(false);
    setNewName('');
    setSearchResults([]);
    setSearchEmpty(false);

    if (codeDebounce.current) clearTimeout(codeDebounce.current);
    if (!broker || !code.trim()) return;

    codeDebounce.current = setTimeout(async () => {
      setIsCodeLooking(true);
      try {
        const price = await broker.getStockPrice(code);
        if (price.name) {
          setNewName(price.name);
          setCodeValidatedNoName(false);
        } else {
          // API 성공했지만 이름 없음 → 직접 입력 유도
          setCodeValidatedNoName(true);
        }
        setIsCodeValidated(true);
      } catch {
        // 유효하지 않은 코드 또는 API 오류
      } finally {
        setIsCodeLooking(false);
      }
    }, 500);
  };

  const handleNameSearch = (text: string) => {
    setNewName(text);
    setSearchResults([]);
    setSearchEmpty(false);

    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!text.trim() || !broker) return;

    searchDebounce.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await broker.searchStock(text);
        setSearchResults(results);
        setSearchEmpty(results.length === 0);
      } catch {
        setSearchResults([]);
        setSearchEmpty(false);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectResult = (item: SearchResult) => {
    setNewCode(item.code);
    setNewName(item.name);
    setNewType(item.type === 'etf' ? 'etf' : 'stock');
    setSearchResults([]);
    setSearchEmpty(false);
    setIsCodeValidated(true);
    setCodeValidatedNoName(false);
  };

  const resetModalState = () => {
    if (codeDebounce.current) clearTimeout(codeDebounce.current);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    setNewCode('');
    setNewName('');
    setNewRatio('');
    setNewType('stock');
    setSearchResults([]);
    setSearchEmpty(false);
    setIsCodeValidated(false);
    setIsCodeLooking(false);
    setCodeValidatedNoName(false);
  };

  const handleAddItem = async () => {
    if (!newCode.trim()) {
      showError('입력 오류', '종목 코드 또는 종목명을 입력해주세요.');
      return;
    }
    if (!newRatio.trim()) {
      showError('입력 오류', '목표 비율을 입력해주세요.');
      return;
    }
    const ratio = parseFloat(newRatio);
    if (isNaN(ratio) || ratio <= 0) {
      showError('입력 오류', '올바른 비율을 입력해주세요.');
      return;
    }

    const code = newCode.trim().toUpperCase();
    let name = newName.trim();
    let type = newType;

    if (!name && type !== 'cash') {
      showError('입력 오류', '종목명을 입력해주세요.\n종목명으로 검색하거나 직접 입력하세요.');
      return;
    }

    // 수동 입력된 코드 검증 (현금 제외)
    if (!isCodeValidated && type !== 'cash') {
      if (!broker) {
        showError('오류', '브로커에 연결되어 있지 않습니다.');
        return;
      }
      setIsValidatingCode(true);
      try {
        // searchStock으로 종목 정보 조회 시도
        const results = await broker.searchStock(code);
        const exact = results.find((r) => r.code === code);
        if (exact) {
          name = exact.name;
          type = exact.type === 'etf' ? 'etf' : 'stock';
        } else {
          // searchStock이 빈 결과 반환 시 getStockPrice로 fallback
          const price = await broker.getStockPrice(code);
          name = price.name || code;
        }
      } catch {
        // searchStock 실패 시 getStockPrice로 fallback
        try {
          const price = await broker.getStockPrice(code);
          name = price.name || code;
        } catch {
          showError('잘못된 종목', `'${code}'는 유효하지 않은 종목 코드입니다.\n종목명으로 검색하여 선택해주세요.`);
          setIsValidatingCode(false);
          return;
        }
      }
      setIsValidatingCode(false);
    }

    try {
      await addItem({ code, name, targetRatio: ratio, type });
      resetModalState();
      setShowAddModal(false);
    } catch (e) {
      showError('추가 오류', (e as Error).message ?? '종목 추가 중 오류가 발생했습니다.');
    }
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
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.deleteBtnArea}
                  onPress={() => handleDeleteItem(item.code, item.name)}
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
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          resetModalState();
          setShowAddModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>종목 추가</Text>

            {/* 종목 코드 입력 */}
            <View>
              <TextInput
                style={[styles.modalInput, isCodeValidated && styles.modalInputValid]}
                placeholder="종목 코드 (예: 005930)"
                value={newCode}
                onChangeText={handleCodeChange}
                autoCorrect={false}
                autoCapitalize="characters"
              />
              {isCodeLooking && (
                <ActivityIndicator size="small" color="#4f46e5" style={{ marginTop: 4 }} />
              )}
              {!isCodeLooking && isCodeValidated && !codeValidatedNoName && (
                <Text style={styles.validatedHint}>✓ 종목 확인됨</Text>
              )}
              {!isCodeLooking && codeValidatedNoName && (
                <Text style={styles.codeNoNameHint}>코드 확인됨 — 아래에서 종목명을 입력하거나 검색하세요</Text>
              )}
            </View>

            {/* 종목명 검색 */}
            <View>
              <TextInput
                style={styles.modalInput}
                placeholder="종목명으로 검색 (예: 삼성전자)"
                value={newName}
                onChangeText={handleNameSearch}
                autoCorrect={false}
              />
              {isSearching && (
                <ActivityIndicator size="small" color="#4f46e5" style={{ marginTop: 4 }} />
              )}
              {searchEmpty && !isSearching && (
                <Text style={styles.searchErrorText}>검색 결과가 없습니다. 다른 종목명을 입력해주세요.</Text>
              )}
              {searchResults.length > 0 && (
                <View style={styles.searchDropdown}>
                  {searchResults.map((r) => (
                    <TouchableOpacity
                      key={r.code}
                      style={styles.searchItem}
                      onPress={() => handleSelectResult(r)}
                    >
                      <Text style={styles.searchItemName}>{r.name}</Text>
                      <Text style={styles.searchItemMeta}>{r.code} · {r.market} · {r.type === 'etf' ? 'ETF' : '주식'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 목표 비율 */}
            <TextInput
              style={styles.modalInput}
              placeholder="목표 비율 (예: 40)"
              value={newRatio}
              onChangeText={setNewRatio}
              keyboardType="numeric"
            />

            {/* 자산 유형 */}
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
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  resetModalState();
                  setShowAddModal(false);
                }}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, isValidatingCode && styles.disabled]}
                onPress={handleAddItem}
                disabled={isValidatingCode}
              >
                {isValidatingCode ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>추가</Text>
                )}
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
  deleteBtnArea: { padding: 6 },
  deleteBtn: { fontSize: 16, color: '#9ca3af' },
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
  modalInputValid: { borderColor: '#16a34a' },
  validatedHint: { fontSize: 12, color: '#16a34a', marginTop: 4, marginLeft: 4 },
  codeNoNameHint: { fontSize: 12, color: '#d97706', marginTop: 4, marginLeft: 4 },
  searchErrorText: { fontSize: 12, color: '#dc2626', marginTop: 4, marginLeft: 4 },
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
  searchDropdown: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  searchItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchItemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  searchItemMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
