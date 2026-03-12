import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBrokerStore } from '@/store/broker';

export default function LoginScreen() {
  const router = useRouter();
  const { broker, setAuthenticated } = useBrokerStore();

  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isMock, setIsMock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!appKey.trim() || !appSecret.trim() || !accountNumber.trim()) {
      Alert.alert('입력 오류', '앱키, 앱시크릿, 계좌번호를 모두 입력해주세요.');
      return;
    }

    if (!broker) {
      Alert.alert('오류', '증권사가 선택되지 않았습니다.');
      return;
    }

    setIsLoading(true);
    try {
      await broker.login({
        appKey: appKey.trim(),
        appSecret: appSecret.trim(),
        accountNumber: accountNumber.trim(),
        isMock,
      });
      setAuthenticated(true);
      router.replace('/(main)/dashboard');
    } catch (e) {
      Alert.alert('로그인 실패', (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>한국투자증권 로그인</Text>
      <Text style={styles.subtitle}>
        KIS Developers에서 발급받은 앱키를 입력해주세요
      </Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>앱 키 (App Key)</Text>
          <TextInput
            style={styles.input}
            value={appKey}
            onChangeText={setAppKey}
            placeholder="앱키를 입력하세요"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>앱 시크릿 (App Secret)</Text>
          <TextInput
            style={styles.input}
            value={appSecret}
            onChangeText={setAppSecret}
            placeholder="앱시크릿을 입력하세요"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>계좌번호</Text>
          <TextInput
            style={styles.input}
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="예: 50123456-01"
            placeholderTextColor="#9ca3af"
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>모의투자 모드</Text>
            <Text style={styles.switchDesc}>실거래 전 모의 테스트</Text>
          </View>
          <Switch
            value={isMock}
            onValueChange={setIsMock}
            trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
            thumbColor={isMock ? '#4f46e5' : '#9ca3af'}
          />
        </View>

        {isMock && (
          <View style={styles.mockBadge}>
            <Text style={styles.mockText}>⚠️ 모의투자 모드 — 실제 주문이 실행되지 않습니다</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>로그인</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.guide}>
        앱키는 KIS Developers(apiportal.koreainvestment.com)에서 발급받을 수 있습니다.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 32, lineHeight: 20 },
  form: { gap: 20 },
  inputGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  switchDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  mockBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
  },
  mockText: { fontSize: 13, color: '#92400e' },
  loginBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  guide: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
});
