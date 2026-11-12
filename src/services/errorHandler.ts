// src/services/errorHandler.ts

export function getHumanReadableErrorMessage(error: any): string {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui.';

  if (typeof error === 'string') return error;

  const code = error.code || '';
  const message = error.message || '';

  // Firebase Auth Error Codes
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
    return 'Email atau kata sandi salah.';
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'Email sudah digunakan oleh akun lain.';
  }
  if (code.includes('auth/weak-password')) {
    return 'Kata sandi terlalu lemah (minimal 8 karakter).';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Terlalu banyak percobaan. Silakan coba lagi nanti.';
  }
  if (code.includes('auth/network-request-failed')) {
    return 'Tidak ada koneksi internet.';
  }

  // Firestore & General Network Error Codes
  if (code.includes('permission-denied') || message.includes('permission-denied')) {
    return 'Aksi ditolak: Anda tidak memiliki izin atau syarat sesi tidak terpenuhi.';
  }
  if (code.includes('unavailable') || message.includes('unavailable')) {
    return 'Layanan Firestore sedang tidak tersedia. Periksa koneksi internet Anda.';
  }
  if (code.includes('not-found') || message.includes('not-found')) {
    return 'Data yang diminta tidak ditemukan.';
  }
  if (code.includes('already-exists') || message.includes('already-exists')) {
    return 'Data sudah terdaftar sebelumnya (duplikasi ditolak).';
  }
  if (code.includes('deadline-exceeded') || message.includes('deadline-exceeded')) {
    return 'Batas waktu permintaan habis. Silakan coba kembali.';
  }
  if (code.includes('resource-exhausted') || message.includes('resource-exhausted')) {
    return 'Batas kuota layanan tercapai. Coba lagi beberapa saat lagi.';
  }
  if (message.includes('Network request failed') || message.includes('network error')) {
    return 'Koneksi jaringan terputus. Silakan periksa koneksi internet Anda.';
  }

  return message || 'Terjadi kesalahan pada sistem.';
}

export function validateLeaveReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length < 10) {
    return 'Alasan izin terlalu pendek (minimal 10 karakter).';
  }
  if (trimmed.length > 500) {
    return 'Alasan izin terlalu panjang (maksimal 500 karakter).';
  }
  return null;
}

