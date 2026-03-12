import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBrokerStore } from '@/store/broker';
import { usePortfolioStore } from '@/store/portfolio';
import { useAllocationStore } from '@/store/allocation';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';
import { BROKER_LIST } from '@/brokers/types';
import { startRebalanceCheck, stopRebalanceCheck } from '@/notifications/triggers';

export default function SettingsScreen() {
  const router = useRouter();
  const { brokerKey, broker, logout, selectBroker } = useBrokerStore();
  const { reset: resetPortfolio } = usePortfolioStore();
  const { config, setThreshold } = useAllocationStore();

  const [autoCheck, setAutoCheckState] = useState(config.autoCheck);

  const currentBroker = BROKER_LIST.find((b) => b.key === brokerKey);

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃하면 저장된 인증 정보가 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          stopRebalanceCheck();
          await logout();
          resetPortfolio();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleChangeBroker = () => {
    Alert.alert('증권사 변경', '증권사를 변경하면 로그아웃됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '변경',
        onPress: async () => {
          stopRebalanceCheck();
          await logout();
          resetPortfolio();
          router.replace('/');
        },
      },
    ]);
  };

  const handleAutoCheckToggle = async (value: boolean) => {
    setAutoCheckState(value);
    if (value && broker) {
      startRebalanceCheck(broker, config, config.checkIntervalMinutes);
    } else {
      stopRebalanceCheck();
    }
  };

  const handleThresholdChange = () => {
    Alert.alert(
      '허용 오차 설정',
      `현재: ±${config.threshold}%\n변경할 값을 선택하세요`,
      [1, 2, 3, 5].map((v) => ({
        text: `±${v}%`,
        onPress: () => setThreshold(v),
      }))
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
      </View>

      {/* 현재 증권사 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>증권사</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.brokerLogo, { backgroundColor: currentBroker?.color ?? '#6b7280' }]}>
              <Text style={styles.brokerLogoText}>{currentBroker?.logoText ?? '?'}</Text>
            </View>
            <Text style={styles.brokerName}>{currentBroker?.name ?? '알 수 없음'}</Text>
            <TouchableOpacity style={styles.changeBtn} onPress={handleChangeBroker}>
              <Text style={styles.changeBtnText}>변경</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 리밸런싱 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>리밸런싱</Text>
        <View style={styles.card}>
          <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleThresholdChange}>
            <Text style={styles.rowLabel}>허용 오차</Text>
            <Text style={styles.rowValue}>±{config.threshold}%</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>자동 체크</Text>
              <Text style={styles.rowDesc}>주기적으로 리밸런싱 필요 여부 확인</Text>
            </View>
            <Switch
              value={autoCheck}
              onValueChange={handleAutoCheckToggle}
              trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
              thumbColor={autoCheck ? '#4f46e5' : '#9ca3af'}
            />
          </View>
        </View>
      </View>

      {/* 계정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>계정</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <Text style={[styles.rowLabel, styles.logoutText]}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 앱 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>앱 정보</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>버전</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>개발</Text>
            <Text style={styles.rowValue}>Maru Team</Text>
          </View>
        </View>
      </View>

      <Text style={styles.disclaimer}>
        ⚠️ 이 앱은 투자 참고용입니다. 투자 결정은 본인 책임입니다.
      </Text>
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
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel: { flex: 1, fontSize: 15, color: '#111827' },
  rowDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  rowValue: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  brokerLogo: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  brokerLogoText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  brokerName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  changeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6' },
  changeBtnText: { fontSize: 13, fontWeight: '600', color: '#4f46e5' },
  logoutText: { color: '#dc2626' },
  disclaimer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    margin: 24,
    lineHeight: 18,
  },
});
