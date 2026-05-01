import { useEffect, useRef, useState } from 'react';
import {
  Box,
  CreditCard,
  DollarSign,
  HandCoins,
  Package,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { DeltaBadge } from './shared';

const ICONS = {
  total_ventas: ShoppingBag,
  cantidad_ventas: CreditCard,
  ticket_promedio: DollarSign,
  productos_vendidos: Package,
  valor_inventario: Box,
  cuentas_por_cobrar: Wallet,
  utilidad_estimada: HandCoins,
};

export default function EstadisticasGenerales({ metrics = [] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  );
}

function MetricCard({ metric }) {
  const Icon = ICONS[metric.id] || ShoppingBag;
  const animatedValue = useAnimatedNumber(metric.value);

  return (
    <article className="rounded-[26px] border border-app bg-white/76 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--accent-line)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">{metric.label}</div>
          <div className="mt-3 font-display text-[2.15rem] leading-none text-main">
            {metric.formatter(animatedValue)}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {metric.deltaLabel && (
          <DeltaBadge value={metric.deltaValue}>{metric.deltaLabel}</DeltaBadge>
        )}
        {metric.note && (
          <span className="text-[12px] text-soft">{metric.note}</span>
        )}
      </div>
    </article>
  );
}

function useAnimatedNumber(value, duration = 700) {
  const [displayValue, setDisplayValue] = useState(Number(value || 0));
  const previousValueRef = useRef(Number(value || 0));

  useEffect(() => {
    const targetValue = Number(value || 0);
    const startValue = previousValueRef.current;
    const startTime = performance.now();
    let animationFrameId = 0;

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = startValue + (targetValue - startValue) * easedProgress;
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(tick);
      } else {
        previousValueRef.current = targetValue;
      }
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [duration, value]);

  return displayValue;
}
