import { createElement } from 'react';
import { Crown, Repeat } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  EmptyPanel,
  PanelShell,
} from './shared';

export default function TablaTopClientes({
  clients = [],
  recurrenceSummary,
  recurrentClients = [],
}) {
  if (!clients.length) {
    return (
      <PanelShell
        title="Top clientes"
        subtitle="Clientes con mayor compra y mejor recurrencia."
      >
        <EmptyPanel
          icon={Crown}
          title="Sin ranking de clientes"
          description="No hay suficiente movimiento para construir el top comercial del periodo."
        />
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title="Top clientes"
      subtitle="Total comprado, frecuencia y lectura de recurrencia."
    >
      <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="overflow-hidden rounded-[24px] border border-app bg-white/72">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-app bg-[var(--panel-soft)]">
                <tr className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Comprado</th>
                  <th className="px-4 py-3">Compras</th>
                  <th className="px-4 py-3">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 10).map((client, index) => (
                  <tr
                    key={`${client.cliente_id}-${index}`}
                    className="border-b border-app last:border-b-0"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-app bg-[var(--panel-soft)] text-[11px] font-semibold text-soft">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-main">
                            {client.nombre}
                          </div>
                          <div className="mt-1 text-[12px] text-soft">
                            {client.numero_documento}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[13px] font-semibold text-main">
                      {formatCurrency(client.total_comprado)}
                    </td>
                    <td className="px-4 py-4 text-[13px] text-soft">
                      {formatNumber(client.cantidad_compras)}
                    </td>
                    <td className="px-4 py-4 text-[13px] text-soft">
                      {formatCurrency(client.ticket_promedio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <SummaryCard
            icon={Repeat}
            label="Clientes recurrentes"
            value={formatNumber(recurrenceSummary?.clientes_recurrentes || 0)}
            note={`${formatNumber(
              recurrenceSummary?.porcentaje_recurrentes || 0,
            )} % del total de clientes con compras.`}
          />
          <SummaryCard
            icon={Crown}
            label="Clientes nuevos"
            value={formatNumber(recurrenceSummary?.clientes_nuevos || 0)}
            note={`${formatNumber(
              recurrenceSummary?.total_clientes || 0,
            )} clientes analizados.`}
          />

          <div className="rounded-[24px] border border-app bg-white/72 p-4">
            <div className="eyebrow">Recurrentes destacados</div>
            <div className="mt-4 space-y-3">
              {recurrentClients.slice(0, 4).map((client) => (
                <article
                  key={client.cliente_id}
                  className="rounded-[18px] border border-app bg-[var(--panel-soft)] px-4 py-4"
                >
                  <div className="text-[13px] font-semibold text-main">
                    {client.nombre}
                  </div>
                  <div className="mt-1 text-[12px] text-soft">
                    {formatNumber(client.total_compras)} compras |{' '}
                    {formatCurrency(client.total_comprado)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function SummaryCard({ icon: IconComponent, label, value, note }) {
  return (
    <div className="rounded-[24px] border border-app bg-white/72 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="eyebrow">{label}</div>
        {createElement(IconComponent, {
          className: 'h-4 w-4 text-[var(--accent)]',
        })}
      </div>
      <div className="mt-3 font-display text-[1.8rem] leading-none text-main">
        {value}
      </div>
      <div className="mt-2 text-[12px] text-soft">{note}</div>
    </div>
  );
}
