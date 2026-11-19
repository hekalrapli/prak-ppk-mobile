// src/hooks/use-push-notifications.ts
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useToast } from '@/components/ui/toast-provider';
import {
  configureForegroundNotificationHandler,
  subscribeForegroundNotifications,
  subscribeNotificationResponses,
  type NotificationTargetPayload,
} from '@/services/notificationService';
import { useAuth } from '@/store/auth-context';

/**
 * FR-P2-01: Mengelola notifikasi masuk saat aplikasi di foreground (menampilkan
 * in-app banner/toast) serta menangani ketukan (tap) notifikasi dari
 * background/quit untuk mengarahkan pengguna ke layar sesi terkait.
 */
export function useNotificationObserver(): void {
  const router = useRouter();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const handledResponseIdsRef = useRef<Set<string>>(new Set());
  const pendingTargetRef = useRef<NotificationTargetPayload | null>(null);

  useEffect(() => {
    configureForegroundNotificationHandler();

    const unsubscribeForeground = subscribeForegroundNotifications((payload) => {
      const message = payload.body
        ? `${payload.title} — ${payload.body}`
        : payload.title;
      showToast(message, 'success');
    });

    return () => {
      unsubscribeForeground();
    };
  }, [showToast]);

  useEffect(() => {
    const navigateToTarget = (target: NotificationTargetPayload) => {
      if (!profile) {
        pendingTargetRef.current = target;
        return;
      }

      pendingTargetRef.current = null;

      if (target.sessionId) {
        const params: { sessionId: string; practicumId?: string } = {
          sessionId: target.sessionId,
        };
        if (target.practicumId) {
          params.practicumId = target.practicumId;
        }

        if (profile.role === 'asisten') {
          router.push({
            pathname: '/asisten/session/[sessionId]',
            params,
          });
        } else {
          router.push({
            pathname: '/praktikan/session/[sessionId]',
            params,
          });
        }
      }
    };

    if (profile && pendingTargetRef.current) {
      navigateToTarget(pendingTargetRef.current);
    }

    const unsubscribeResponses = subscribeNotificationResponses(
      (target, responseId) => {
        if (handledResponseIdsRef.current.has(responseId)) {
          return;
        }
        handledResponseIdsRef.current.add(responseId);
        navigateToTarget(target);
      }
    );

    return () => {
      unsubscribeResponses();
    };
  }, [profile, router]);
}
