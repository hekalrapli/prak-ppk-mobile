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

export type NotificationNavigationTarget =
  | {
      kind: 'session';
      pathname: SessionRoutePathname;
      params: { sessionId: string; practicumId: string; tab?: string };
    }
  | {
      kind: 'history';
      pathname: '/praktikan/history';
      params: { tab: 'leave' };
    }
  | {
      kind: 'fine-detail';
      pathname: '/praktikan/fines/[fineId]';
      params: { fineId: string };
    }
  | {
      kind: 'fines-list';
      pathname: '/praktikan/fines';
    }
  | {
      kind: 'payments-history';
      pathname: '/praktikan/payments';
    }
  | {
      kind: 'home';
      pathname: '/praktikan' | '/asisten' | '/aslab';
    };

/**
 * Pemetaan terpusat tipe event notifikasi sesi -> rute tujuan per peran.
 */
export const NOTIFICATION_EVENT_ROUTES: Record<
  string,
  Partial<Record<UserRole, SessionRoutePathname>>
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

function getRoleHomeRoute(role: UserRole): '/praktikan' | '/asisten' | '/aslab' {
  if (role === 'asisten') {
    return '/asisten';
  }
  if (role === 'aslab') {
    return '/aslab';
  }
  return '/praktikan';
}

export function resolveNotificationNavigation(
  target: NotificationTargetPayload,
  role: UserRole
): NotificationNavigationTarget {
  if (role === 'aslab') {
    return { kind: 'home', pathname: '/aslab' };
  }

  // FR-S4-P3-03: Event siklus denda & pembayaran Midtrans untuk praktikan.
  if (role === 'praktikan') {
    const fineId = target.fineId?.trim();
    if (target.type === 'fine_created' || target.type === 'payment_failed') {
      if (fineId) {
        return {
          kind: 'fine-detail',
          pathname: '/praktikan/fines/[fineId]',
          params: { fineId },
        };
      }
      return { kind: 'fines-list', pathname: '/praktikan/fines' };
    }
    if (target.type === 'payment_success') {
      return { kind: 'payments-history', pathname: '/praktikan/payments' };
    }
  }

  const sessionId = target.sessionId?.trim();
  const practicumId = target.practicumId?.trim();

  if (!sessionId || !practicumId) {
    if (target.type === 'leave_decision' && role === 'praktikan') {
      return {
        kind: 'history',
        pathname: '/praktikan/history',
        params: { tab: 'leave' },
      };
    }
    return { kind: 'home', pathname: getRoleHomeRoute(role) };
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
    kind: 'session',
    pathname,
    params: {
      sessionId,
      practicumId,
      ...(target.type === 'leave_decision' && role === 'praktikan'
        ? { tab: 'izin' }
        : {}),
    },
  };
}

/**
 * FR-P2-01, FR-P2-02 & FR-S4-P3-03: Mengelola notifikasi masuk saat foreground
 * (in-app toast) serta menangani ketukan notifikasi (background & cold start).
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
      const tone = payload.data.type === 'payment_failed' ? 'error' : 'success';
      showToast(message, tone);
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
        if (destination.kind === 'session') {
          router.push({
            pathname: destination.pathname,
            params: destination.params,
          });
        } else if (destination.kind === 'fine-detail') {
          router.push({
            pathname: destination.pathname,
            params: destination.params,
          });
        } else if (
          destination.kind === 'fines-list' ||
          destination.kind === 'payments-history'
        ) {
          router.push(destination.pathname);
        } else if (destination.kind === 'history') {
          router.replace({
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
