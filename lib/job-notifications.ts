import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type ReminderJob = {
  id: string;
  message: string | null;
  runAt: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  type: 'agent_query' | 'refresh_assignments' | 'remind_user';
};

const REMINDERS_CHANNEL_ID = 'cbud-reminders';
const JOB_ID_KEY = 'cbudJobId';
const RUN_AT_KEY = 'cbudRunAt';

export type JobNotificationPermission = 'enabled' | 'disabled' | 'unsupported';

function notificationsAreSupported(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function permissionIsGranted(settings: Notifications.NotificationPermissionsStatus): boolean {
  return (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function prepareAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
  });
}

export async function getJobNotificationPermission(): Promise<JobNotificationPermission> {
  if (!notificationsAreSupported()) return 'unsupported';
  const settings = await Notifications.getPermissionsAsync();
  return permissionIsGranted(settings) ? 'enabled' : 'disabled';
}

export async function requestJobNotificationPermission(): Promise<boolean> {
  if (!notificationsAreSupported()) return false;
  await prepareAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  if (permissionIsGranted(current)) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return permissionIsGranted(requested);
}

function notificationJobId(notification: Notifications.NotificationRequest): string | null {
  const value = notification.content.data?.[JOB_ID_KEY];
  return typeof value === 'string' ? value : null;
}

function reminderBody(job: ReminderJob): string {
  return job.message?.trim() || 'You asked cbud to remind you about this.';
}

export async function clearJobNotifications(): Promise<void> {
  if (!notificationsAreSupported()) return;

  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    notifications
      .filter((notification) => notificationJobId(notification) !== null)
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );
}

export async function syncJobNotifications(jobs: ReminderJob[]): Promise<number> {
  if (!notificationsAreSupported()) return 0;
  const permission = await getJobNotificationPermission();
  if (permission !== 'enabled') return 0;

  await prepareAndroidChannel();

  const now = Date.now();
  const reminders = jobs.filter((job) => (
    job.type === 'remind_user' &&
    job.status === 'scheduled' &&
    new Date(job.runAt).getTime() > now
  ));
  const remindersById = new Map(reminders.map((job) => [job.id, job]));
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const retainedJobIds = new Set<string>();

  await Promise.all(scheduled.map(async (notification) => {
    const jobId = notificationJobId(notification);
    if (!jobId) return;

    const job = remindersById.get(jobId);
    const scheduledRunAt = notification.content.data?.[RUN_AT_KEY];
    const isCurrent = (
      job &&
      scheduledRunAt === job.runAt &&
      notification.content.body === reminderBody(job) &&
      !retainedJobIds.has(jobId)
    );
    if (isCurrent) {
      retainedJobIds.add(jobId);
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
  }));

  const missing = reminders.filter((job) => !retainedJobIds.has(job.id));
  await Promise.all(missing.map((job) => Notifications.scheduleNotificationAsync({
    content: {
      title: 'cbud reminder',
      body: reminderBody(job),
      data: {
        [JOB_ID_KEY]: job.id,
        [RUN_AT_KEY]: job.runAt,
        url: '/jobs',
      },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(job.runAt),
      channelId: Platform.OS === 'android' ? REMINDERS_CHANNEL_ID : undefined,
    },
  })));

  return reminders.length;
}
