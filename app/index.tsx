import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useBrokerStore } from '@/store/broker';
import { BrokerSelector } from '@/components/BrokerSelector';
import { BROKER_LIST } from '@/brokers/types';

export default function IndexScreen() {
  const router = useRouter();
  const { brokerKey, isAuthenticated, selectBroker, isLoading } = useBrokerStore();

  useEffect(() => {
    if (!brokerKey) return;

    if (isAuthenticated) {
      router.replace('/(main)/dashboard');
    } else {
      router.replace('/(auth)/login');
    }
  }, [brokerKey, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>초기화 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🐾 마루</Text>
        <Text style={styles.title}>증권사를 선택해주세요</Text>
        <Text style={styles.subtitle}>선택한 증권사의 API로 모든 기능이 동작합니다</Text>
      </View>

      <BrokerSelector
        brokers={BROKER_LIST}
        selected={brokerKey ?? undefined}
        onSelect={(key) => selectBroker(key)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 24,
    paddingTop: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: { color: '#e5e7eb', marginTop: 12, fontSize: 14 },
  header: { marginBottom: 40, alignItems: 'center' },
  logo: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
});
