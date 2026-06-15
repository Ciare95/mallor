import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { crearCliente } from '../services/clientes.service';
import { extractApiError } from '../utils/ventas';
import { Colors, Radius, Spacing, Typography } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (cliente: any) => void;
}

export function CrearClienteModal({ visible, onClose, onCreated }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ tipo_documento: 'CC', numero_documento: '', nombre_completo: '', telefono: '' });
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: crearCliente,
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setForm({ tipo_documento: 'CC', numero_documento: '', nombre_completo: '', telefono: '' });
      setError('');
      onCreated({ ...cliente, persisted: true, esTemporal: false });
    },
    onError: (err: any) => setError(extractApiError(err, 'Error al crear cliente.')),
  });

  const handleGuardar = () => {
    if (!form.numero_documento.trim() || !form.nombre_completo.trim()) {
      setError('Documento y nombre son requeridos.');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Nuevo cliente</Text>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.fieldGroup}>
              {[
                { key: 'numero_documento', label: 'Número de documento', keyboardType: 'numeric' as const },
                { key: 'nombre_completo', label: 'Nombre completo *' },
                { key: 'telefono', label: 'Teléfono', keyboardType: 'phone-pad' as const },
              ].map((f) => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key as keyof typeof form]}
                    onChangeText={set(f.key as keyof typeof form)}
                    keyboardType={f.keyboardType}
                    autoCapitalize="words"
                  />
                </View>
              ))}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.cta, mutation.isPending && styles.ctaDisabled]} onPress={handleGuardar} disabled={mutation.isPending}>
              {mutation.isPending ? <ActivityIndicator color={Colors.ctaText} /> : <Text style={styles.ctaText}>Guardar</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, maxHeight: '80%',
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  title: { ...Typography.heading, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  fieldGroup: { gap: Spacing.md },
  field: { gap: 4 },
  label: Typography.label,
  input: { ...Typography.body, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 8 },
  error: { ...Typography.secondary, color: '#9F2F2D' },
  cta: { backgroundColor: Colors.ctaBg, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...Typography.body, color: Colors.ctaText, fontWeight: '600' },
});
