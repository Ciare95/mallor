import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '../store/useAuthStore';
import { Colors, Spacing, Typography, Radius } from '../theme';

export function EmpresaSelector() {
  const { empresas, empresaActiva, setEmpresaActiva } = useAuthStore();
  const [open, setOpen] = useState(false);

  if (empresas.length <= 1) return null;

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.nombre} numberOfLines={1}>
          {empresaActiva?.nombre_comercial || empresaActiva?.razon_social}
        </Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Empresa</Text>
            <ScrollView>
              {empresas.map((e) => (
                <Pressable
                  key={e.id}
                  style={[styles.item, e.id === empresaActiva?.id && styles.itemActive]}
                  onPress={async () => { await setEmpresaActiva(e); setOpen(false); }}
                >
                  <Text style={styles.itemText}>{e.nombre_comercial || e.razon_social}</Text>
                  {e.id === empresaActiva?.id && (
                    <Ionicons name="checkmark" size={16} color={Colors.textPrimary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 160,
  },
  nombre: { ...Typography.secondary, color: Colors.textPrimary, fontWeight: '500', flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    maxHeight: '60%',
  },
  sheetTitle: { ...Typography.label, textAlign: 'center', marginBottom: Spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemActive: { backgroundColor: Colors.canvas },
  itemText: Typography.body,
});
