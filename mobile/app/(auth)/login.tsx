import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthStore } from '../../src/store/useAuthStore';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://mallor.onrender.com/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setSession = useAuthStore((s) => s.setSession);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${BASE_URL}/auth/mobile/login/`, {
        username: username.trim(),
        password,
      });
      await setSession(data);
      router.replace('/(app)/ventas');
    } catch (err: any) {
      const msg = err?.response?.data?.detail
        || err?.response?.data?.non_field_errors?.[0]
        || 'Usuario o contraseña incorrectos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Mallor</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, borderBottomWidth: 0 }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                placeholderTextColor={Colors.textMuted}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>
            <View style={styles.fieldUnderline} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.cta, loading && styles.ctaDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.ctaText} />
              : <Text style={styles.ctaText}>Ingresar</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.title,
    fontSize: 32,
    marginBottom: Spacing.xl,
  },
  form: { gap: Spacing.lg },
  field: { gap: Spacing.xs },
  label: Typography.label,
  input: {
    ...Typography.body,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldUnderline: { height: 1, backgroundColor: Colors.border },
  eyeBtn: { padding: Spacing.sm },
  error: { ...Typography.secondary, color: '#9F2F2D' },
  cta: {
    backgroundColor: Colors.ctaBg,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
});
