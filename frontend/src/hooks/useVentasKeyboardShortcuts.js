import { useEffect, useEffectEvent } from 'react';
import {
  isEditableTarget,
  matchesShortcut,
  normalizeShortcut,
} from '../utils/shortcuts';

export function useVentasKeyboardShortcuts({
  enabled,
  shortcuts,
  onRegistrarVenta,
  onConfigurarCobro,
  onNuevaPrecuenta,
  onQuitarUltimoProducto,
}) {
  const handleKeyDown = useEffectEvent((event) => {
    if (!enabled || isEditableTarget(event.target)) {
      return;
    }

    const normalizedShortcuts = {
      registrar_venta: normalizeShortcut(shortcuts?.registrar_venta),
      configurar_cobro: normalizeShortcut(shortcuts?.configurar_cobro),
      nueva_precuenta: normalizeShortcut(shortcuts?.nueva_precuenta),
      quitar_ultimo_producto: normalizeShortcut(
        shortcuts?.quitar_ultimo_producto,
      ),
    };

    if (
      normalizedShortcuts.registrar_venta
      && matchesShortcut(event, normalizedShortcuts.registrar_venta)
    ) {
      event.preventDefault();
      onRegistrarVenta?.();
      return;
    }

    if (
      normalizedShortcuts.configurar_cobro
      && matchesShortcut(event, normalizedShortcuts.configurar_cobro)
    ) {
      event.preventDefault();
      onConfigurarCobro?.();
      return;
    }

    if (
      normalizedShortcuts.nueva_precuenta
      && matchesShortcut(event, normalizedShortcuts.nueva_precuenta)
    ) {
      event.preventDefault();
      onNuevaPrecuenta?.();
      return;
    }

    if (
      normalizedShortcuts.quitar_ultimo_producto
      && matchesShortcut(event, normalizedShortcuts.quitar_ultimo_producto)
    ) {
      event.preventDefault();
      onQuitarUltimoProducto?.();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
