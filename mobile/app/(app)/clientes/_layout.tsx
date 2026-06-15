import { Stack } from 'expo-router';
import { Colors } from '../../../src/theme';

export default function ClientesLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.canvas } }} />;
}
