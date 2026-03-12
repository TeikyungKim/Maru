import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rebalance', {
      name: '리밸런싱 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendRebalanceNotification(
  needsRebalanceCount: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 리밸런싱 필요',
      body: `${needsRebalanceCount}개 종목의 비율이 허용 오차를 초과했습니다. 확인해주세요.`,
      data: { type: 'rebalance' },
      sound: true,
    },
    trigger: null, // 즉시 발송
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
