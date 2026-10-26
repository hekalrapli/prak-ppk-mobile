import React, { createContext, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Radius, Spacing } from '../../constants/theme';

type ToastType = 'success' | 'error';

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string, toastType: ToastType = 'success') => {
    setMessage(msg);
    setType(toastType);
    setVisible(true);

    // Animasi muncul perlahan, diam 2.5 detik, lalu menghilang perlahan
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <View style={styles.overlay} pointerEvents="none">
          <Animated.View 
            style={[
              styles.toastBox, 
              { opacity },
              type === 'success' ? styles.successBg : styles.errorBg
            ]}
          >
            <Text style={styles.text}>{message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast harus digunakan di dalam ToastProvider');
  return context;
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100, // Muncul di bagian bawah, di atas area tombol
    zIndex: 9999,
  },
  toastBox: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    maxWidth: '90%',
  },
  successBg: { backgroundColor: '#10B981' }, // Hijau Success
  errorBg: { backgroundColor: '#EF4444' }, // Merah Error
  text: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});