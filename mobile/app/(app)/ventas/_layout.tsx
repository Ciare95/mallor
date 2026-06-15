import { Stack } from 'expo-router';
import { Colors } from '../../../src/theme';

export default function VentasLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.canvas } }} />;
}
