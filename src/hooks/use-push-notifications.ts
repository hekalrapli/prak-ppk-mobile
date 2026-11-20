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
import type { UserRole } from '@/types/attendance';

type SessionRoutePathname =
  | '/praktikan/session/[sessionId]'
  | '/asisten/session/[sessionId]';

type RoleHomePathname = '/praktikan' | '/asisten';

/**
 * Pemetaan terpusat tipe event notifikasi -> rute tujuan per peran.
 * Mengubah tujuan navigasi untuk satu tipe event cukup mengubah satu baris di sini.
 */
export const NOTIFICATION_EVENT_ROUTES: Record<
  string,
  Record<UserRole, SessionRoutePathname>
> = {
  session_opened: {
    praktikan: '/praktikan/session/[sessionId]',
    asisten: '/asisten/session/[sessionId]',
  },
  schedule_modified: {
    praktikan: '/praktikan/session/[sessionId]',
    asisten: '/asisten/session/[sessionId]',
  },
  leave_decision: {
    praktikan: '/praktikan/session/[sessionId]',
    asisten: '/asisten/session/[sessionId]',
  },
};

function getRoleHomeRoute(role: UserRole): RoleHomePathname {
  return role === 'asisten' ? '/asisten' : '/praktikan';
}

export function resolveNotificationNavigation(
  target: NotificationTargetPayload,
  role: UserRole
):
  | { pathname: SessionRoutePathname; params: { sessionId: string; practicumId: string } }
  | { pathname: RoleHomePathname } {
  const sessionId = target.sessionId?.trim();
  const practicumId = target.practicumId?.trim();

  if (!sessionId || !practicumId) {
    return { pathname: getRoleHomeRoute(role) };
  }

  const mapped = target.type
    ? NOTIFICATION_EVENT_ROUTES[target.type]?.[role]
    : undefined;
  const pathname: SessionRoutePathname =
    mapped ??
    (role === 'asisten'
      ? '/asisten/session/[sessionId]'
      : '/praktikan/session/[sessionId]');

  return {
    pathname,
    params: { sessionId, practicumId },
  };
}

/**
 * FR-P2-01 & FR-P2-02: Mengelola notifikasi masuk saat aplikasi di foreground
 * (menampilkan in-app toast) serta menangani ketukan notifikasi (background &
 * cold start) menuju rute yang tepat.
 */
export function useNotificationObserver(): void {
  const router = useRouter();
  const { profile, initializing, profileLoading } = useAuth();
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
      if (initializing || profileLoading || !profile) {
        pendingTargetRef.current = target;
        return;
      }

      pendingTargetRef.current = null;
      const destination = resolveNotificationNavigation(target, profile.role);

      try {
        if ('params' in destination) {
          router.push({
            pathname: destination.pathname,
            params: destination.params,
          });
        } else {
          router.replace(destination.pathname);
        }
      } catch {
        router.replace(getRoleHomeRoute(profile.role));
      }
    };

    if (!initializing && !profileLoading && profile && pendingTargetRef.current) {
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
  }, [profile, initializing, profileLoading, router]);
}
