import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useBrokerStore } from '@/store/broker';
import { useAllocationStore } from '@/store/allocation';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';
import { requestPermissions } from '@/notifications/service';

export default function RootLayout() {
  const { selectBroker, setAuthenticated } = useBrokerStore();
  const { loadConfig } = useAllocationStore();

  useEffect(() => {
    async function init() {
      // 알림 권한 요청
      await requestPermissions();

      // 저장된 증권사 복구
      const savedBroker = await storage.get(STORAGE_KEYS.BROKER);
      if (savedBroker) {
        await selectBroker(savedBroker);

        // 저장된 토큰으로 자동 로그인 확인
        const token = await storage.get(STORAGE_KEYS.KIS_ACCESS_TOKEN);
        const expires = await storage.get(STORAGE_KEYS.KIS_TOKEN_EXPIRES);
        if (token && expires && Date.now() < Number(expires)) {
          setAuthenticated(true);
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
