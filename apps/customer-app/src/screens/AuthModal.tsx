import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { isValidEmail, isValidIndianMobile } from '@mymart/shared';
import { useCustomerAuth } from '../context/AuthContext';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const { signIn, signUp } = useCustomerAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name');
        return;
      }
      if (!isValidIndianMobile(phone)) {
        setErrorMsg('Please enter a valid 10-digit Indian phone number');
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signIn(email, password);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMsg(res.error || 'Failed to sign in');
        }
      } else {
        const res = await signUp(email, password, fullName, phone);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMsg(res.error || 'Failed to register account');
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.overlay}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'signin' ? 'Sign In to MyMart' : 'Create Customer Account'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          {mode === 'signin'
            ? 'Access your saved addresses and track quick deliveries'
            : 'Get groceries delivered in 10-15 minutes at lowest prices'}
        </Text>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          {mode === 'signup' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Rahul Sharma"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>10-Digit Mobile Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder="9876543210"
                  style={styles.input}
                />
              </View>
            </>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="customer@example.com"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••••••"
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            style={styles.submitBtn}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'signin' ? 'Sign In' : 'Create Free Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setErrorMsg(null);
              setMode(mode === 'signin' ? 'signup' : 'signin');
            }}
            style={styles.toggleModeBtn}
          >
            <Text style={styles.toggleModeText}>
              {mode === 'signin'
                ? "Don't have an account? Sign Up Free"
                : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.guestBtn}>
            <Text style={styles.guestBtnText}>Continue Browsing as Guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#e11d48',
    fontSize: 11,
    fontWeight: '700',
  },
  form: {
    gap: 12,
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  submitBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  toggleModeBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleModeText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '800',
  },
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  guestBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
});
