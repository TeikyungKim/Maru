import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useBrokerStore } from '@/store/broker';
import { useAllocationStore } from '@/store/allocation';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';
import { requestPermissions } from '@/notifications/service';
import { loadCredentials } from '@/brokers/kis/auth';

export default function RootLayout() {
  const { selectBroker, setAuthenticated, broker } = useBrokerStore();
  const { loadConfig } = useAllocationStore();

  useEffect(() => {
    async function init() {
      // 알림 권한 요청
      await requestPermissions();

      // 저장된 증권사 복구
      const savedBroker = await storage.get(STORAGE_KEYS.BROKER);
      if (savedBroker) {
        await selectBroker(savedBroker);

        // 인증 정보 메모리 복구
        const creds = await loadCredentials();

        if (creds) {
          const token = await storage.get(STORAGE_KEYS.KIS_ACCESS_TOKEN);
          const expires = await storage.get(STORAGE_KEYS.KIS_TOKEN_EXPIRES);

          if (token && expires && Date.now() < Number(expires)) {
            // 유효한 토큰 — 자동 로그인
            setAuthenticated(true);
          } else {
            // 토큰 만료 — 자격증명으로 조용히 재발급 시도
            try {
              const { issueToken } = await import('@/brokers/kis/auth');
              await issueToken(creds);
              setAuthenticated(true);
            } catch {
              // 재발급 실패 — 로그인 화면으로
            }
          }
        }
      }

      // 자산배분 설정 로드
      await loadConfig();
    }

    init();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </>
  );
}
