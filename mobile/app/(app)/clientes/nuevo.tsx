import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Header } from '../../../src/components/Header';
import { autocompletarCliente, crearCliente } from '../../../src/services/clientes.service';
import { extractApiError } from '../../../src/utils/ventas';
import { Colors, Spacing, Typography, Radius } from '../../../src/theme';

const TIPOS_DOC = ['CC', 'NIT', 'CE', 'PAS', 'TI'];

export default function NuevoClienteScreen() {
  const { nombre: nombreParam } = useLocalSearchParams<{ nombre?: string }>();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    tipo_documento: 'CC',
    numero_documento: '',
    nombre_completo: nombreParam ?? '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleAutocompletar = async () => {
    if (!form.numero_documento.trim()) return;
    try {
      const data = await autocompletarCliente({
        tipoDocumento: form.tipo_documento,
        numeroDocumento: form.numero_documento.trim(),
      });
      if (data?.nombre_completo) {
        setForm((f) => ({ ...f, nombre_completo: data.nombre_completo }));
      }
    } catch { /* ignorar */ }
  };

  const mutation = useMutation({
    mutationFn: crearCliente,
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      router.replace(`/(app)/clientes/${cliente.id}`);
    },
    onError: (err: any) => setError(extractApiError(err, 'Error al crear cliente.')),
  });

  const handleGuardar = () => {
    if (!form.numero_documento.trim() || !form.nombre_completo.trim()) {
      setError('Documento y nombre son requeridos.');
      return;
    }
    setError('');
    mutation.mutate(form);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.screen}>
        <Header title="Nuevo cliente" showBack />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Field label="Tipo documento">
              <View style={styles.tipoRow}>
                {TIPOS_DOC.map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.tipoBtn, form.tipo_documento === t && styles.tipoBtnActive]}
                    onPress={() => set('tipo_documento')(t)}
                  >
                    <Text style={[styles.tipoBtnText, form.tipo_documento === t && styles.tipoBtnTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>
            <Field label="Número de documento">
              <TextInput
                style={styles.input}
                value={form.numero_documento}
                onChangeText={set('numero_documento')}
                keyboardType="numeric"
                returnKeyType="done"
                onBlur={handleAutocompletar}
              />
            </Field>
            <Field label="Nombre completo *">
              <TextInput style={styles.input} value={form.nombre_completo} onChangeText={set('nombre_completo')} />
            </Field>
            <Field label="Teléfono">
              <TextInput style={styles.input} value={form.telefono} onChangeText={set('telefono')} keyboardType="phone-pad" />
            </Field>
            <Field label="Correo">
              <TextInput style={styles.input} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
            </Field>
            <Field label="Dirección" last>
              <TextInput style={styles.input} value={form.direccion} onChangeText={set('direccion')} />
            </Field>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.cta, mutation.isPending && styles.ctaDisabled]} onPress={handleGuardar} disabled={mutation.isPending}>
            {mutation.isPending
              ? <ActivityIndicator color={Colors.ctaText} />
              : <Text style={styles.ctaText}>Guardar cliente</Text>}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.canvas },
  content: { padding: Spacing.md, gap: Spacing.lg },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  field: { paddingHorizontal: Spacing.md, paddingVertical: 12 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  fieldLabel: { ...Typography.label, marginBottom: 4 },
  input: { ...Typography.body, paddingVertical: 4 },
  tipoRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  tipoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipoBtnActive: { backgroundColor: Colors.ctaBg, borderColor: Colors.ctaBg },
  tipoBtnText: Typography.secondary,
  tipoBtnTextActive: { color: Colors.ctaText },
  error: { ...Typography.secondary, color: '#9F2F2D' },
  cta: { backgroundColor: Colors.ctaBg, borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
});
