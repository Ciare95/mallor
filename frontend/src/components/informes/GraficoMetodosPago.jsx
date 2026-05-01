import { Landmark } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  EmptyPanel,
  PanelShell,
} from './shared';

export default function GraficoMetodosPago({
  totalGeneral = 0,
  paymentMethods = [],
}) {
  if (!paymentMethods.length) {
    return (
      <PanelShell
        title="Metodos de pago"
        subtitle="Lectura del mix de recaudo en el periodo."
      >
        <EmptyPanel
          icon={Landmark}
          title="Sin movimiento de recaudo"
          description="No hay pagos registrados para mostrar la mezcla del periodo."
        />
      </PanelShell>
    );
  }

  const maxValue = Math.max(
    ...paymentMethods.map((item) => Number(item.total_vendido || 0)),
    1,
  );

  return (
    <PanelShell
      title="Metodos de pago"
      subtitle={`Participacion sobre ${formatCurrency(totalGeneral)} facturados.`}
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_0.92fr]">
        <div className="grid h-[280px] grid-cols-2 gap-3 sm:grid-cols-4">
          {paymentMethods.map((item) => (
            <div key={item.metodo_pago} className="flex flex-col justify-end gap-3">
              <div className="relative flex-1 overflow-hidden rounded-[20px] border border-app bg-[var(--panel-soft)]">
                <div
                  className="absolute inset-x-2 bottom-2 rounded-[16px] bg-[linear-gradient(180deg,rgba(31,108,159,0.25),rgba(31,108,159,0.95))]"
                  style={{
                    height: `${Math.max(
                      (Number(item.total_vendido || 0) / maxValue) * 100,
                      10,
                    )}%`,
                  }}
                />
              </div>
              <div className="space-y-1 text-center">
                <div className="text-[12px] font-semibold text-main">
                  {item.label}
                </div>
                <div className="text-[11px] text-soft">
                  {formatNumber(item.porcentaje)} %
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {paymentMethods.map((item) => (
            <article
              key={item.metodo_pago}
              className="rounded-[20px] border border-app bg-white/72 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-main">
                    {item.label}
                  </div>
                  <div className="mt-1 text-[12px] text-soft">
                    {formatNumber(item.cantidad_ventas)} ventas registradas
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-main">
                    {formatCurrency(item.total_vendido)}
                  </div>
                  <div className="mt-1 text-[12px] text-soft">
                    {formatNumber(item.porcentaje)} %
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
