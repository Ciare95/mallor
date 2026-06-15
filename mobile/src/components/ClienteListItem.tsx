import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '../theme';

interface Props {
  cliente: { id: number; nombre_completo: string; numero_documento: string; tipo_documento: string; telefono?: string };
  onPress: () => void;
}

export function ClienteListItem({ cliente, onPress }: Props) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Text style={styles.nombre} numberOfLines={1}>{cliente.nombre_completo}</Text>
      <Text style={styles.doc}>{cliente.tipo_documento} {cliente.numero_documento}</Text>
      {cliente.telefono ? <Text style={styles.tel}>{cliente.telefono}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  nombre: { ...Typography.body, fontWeight: '500' },
  doc: { ...Typography.secondary, marginTop: 2 },
  tel: { ...Typography.secondary, marginTop: 1 },
});
