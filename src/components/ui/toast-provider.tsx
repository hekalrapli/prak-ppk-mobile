import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

type ToastType = 'success' | 'error';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const [opacity] = useState(() => new Animated.Value(0));
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const showToast = useCallback((nextMessage: string, nextType: ToastType = 'success') => {
    setMessage(nextMessage);
    setType(nextType);
    setToastKey((key) => key + 1);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    animationRef.current?.stop();
    opacity.setValue(0);

    const animation = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.delay(2600),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]);

    animationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) {
        setVisible(false);
      }
    });

    return () => {
      animation.stop();
    };
  }, [opacity, toastKey, visible]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const accentColor = type === 'success' ? theme.success : theme.error;
  const accentBackground = type === 'success' ? theme.successSoft : theme.errorSoft;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible ? (
        <View pointerEvents="none" style={styles.overlay}>
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              styles.toast,
              {
                backgroundColor: theme.surface,
                borderColor: accentColor,
                opacity,
              },
            ]}>
            <View style={[styles.icon, { backgroundColor: accentBackground }]}>
              <Text style={[styles.iconLabel, { color: accentColor }]}>
                {type === 'success' ? '✓' : '!'}
              </Text>
            </View>
            <Text style={[styles.message, { color: theme.textPrimary }]}>{message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six + Spacing.five + Spacing.one,
    zIndex: 9999,
  },
  toast: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  message: { flex: 1, fontSize: 16, fontWeight: '600', lineHeight: 22 },
});
