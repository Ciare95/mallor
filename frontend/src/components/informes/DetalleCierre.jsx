import { useState } from 'react';
import { Download, FilePenLine, Printer, Save } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import ImprimirCierre from './ImprimirCierre';
import { EmptyPanel, PanelShell } from './shared';

const MANUAL_EXPENSE_FIELDS = [
  ['servicios_publicos', 'Servicios publicos'],
  ['arriendos', 'Arriendos'],
  ['salarios', 'Salarios'],
  ['otros_gastos', 'Otros gastos'],
];

export default function DetalleCierre({
  cierre,
  onSave,
  onPrint,
  onDownloadPdf,
  isSaving,
}) {
  if (!cierre) {
    return (
      <PanelShell
        title="Detalle del cierre"
        subtitle="Selecciona un cierre del historial o genera uno nuevo para revisar su resumen."
      >
        <EmptyPanel
          title="Sin cierre seleccionado"
          description="El detalle aparecera aqui con ventas, gastos, diferencia y opciones de impresion."
        />
      </PanelShell>
    );
  }

  return (
    <DetalleCierreContent
      key={cierre.id}
      cierre={cierre}
      onSave={onSave}
      onPrint={onPrint}
      onDownloadPdf={onDownloadPdf}
      isSaving={isSaving}
    />
  );
}

function DetalleCierreContent({
  cierre,
  onSave,
  onPrint,
  onDownloadPdf,
  isSaving,
}) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(() => ({
    efectivo_real: String(cierre.efectivo_real || ''),
    observaciones: cierre.observaciones || '',
    gastos: {
      servicios_publicos: {
        monto: String(cierre.gastos_operativos?.servicios_publicos?.monto || ''),
        descripcion:
          cierre.gastos_operativos?.servicios_publicos?.descripcion || '',
      },
      arriendos: {
        monto: String(cierre.gastos_operativos?.arriendos?.monto || ''),
        descripcion: cierre.gastos_operativos?.arriendos?.descripcion || '',
      },
      salarios: {
        monto: String(cierre.gastos_operativos?.salarios?.monto || ''),
        descripcion: cierre.gastos_operativos?.salarios?.descripcion || '',
      },
      otros_gastos: {
        monto: String(cierre.gastos_operativos?.otros_gastos?.monto || ''),
        descripcion: cierre.gastos_operativos?.otros_gastos?.descripcion || '',
      },
    },
  }));

  const handleFieldChange = (path, value) => {
    if (path.startsWith('gastos.')) {
      const [, expenseKey, field] = path.split('.');
      setForm((current) => ({
        ...current,
        gastos: {
          ...current.gastos,
          [expenseKey]: {
            ...current.gastos[expenseKey],
            [field]: value,
          },
        },
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [path]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(cierre.id, form, () => setEditMode(false));
  };

  return (
    <PanelShell
      title={`Detalle del cierre ${cierre.fecha_cierre}`}
      subtitle="Revision de recaudo, gastos, categorias y diferencia de efectivo."
      actions={
        <>
          <button
            type="button"
            onClick={() => setEditMode((current) => !current)}
            className="app-button-secondary min-h-10"
          >
            <FilePenLine className="h-4 w-4" />
            {editMode ? 'Cancelar ajuste' : 'Ajustar cierre'}
          </button>
          <button
            type="button"
            onClick={() => onPrint(cierre)}
            className="app-button-secondary min-h-10"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          <button
            type="button"
            onClick={() => onDownloadPdf(cierre.id)}
            className="app-button-secondary min-h-10"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-4">
          <InfoCard
            label="Usuario"
            value={
              cierre.usuario_cierre?.full_name ||
              cierre.usuario_cierre?.username ||
              'Sin usuario'
            }
          />
          <InfoCard
            label="Registrado"
            value={formatDateTime(cierre.fecha_registro)}
          />
          <InfoCard
            label="Total ventas"
            value={formatCurrency(cierre.total_ventas)}
          />
          <InfoCard
            label="Diferencia"
            value={formatCurrency(cierre.diferencia)}
            tone={
              Number(cierre.diferencia || 0) > 0
                ? 'success'
                : Number(cierre.diferencia || 0) < 0
                  ? 'danger'
                  : 'neutral'
            }
          />

          <div className="rounded-[22px] border border-app bg-[var(--panel-soft)] p-4">
            <div className="eyebrow">Metodos de pago</div>
            <div className="mt-4 space-y-3">
              <InfoRow label="Efectivo" value={formatCurrency(cierre.total_efectivo)} />
              <InfoRow label="Tarjeta" value={formatCurrency(cierre.total_tarjeta)} />
              <InfoRow
                label="Transferencia"
                value={formatCurrency(cierre.total_transferencia)}
              />
              <InfoRow label="Credito" value={formatCurrency(cierre.total_credito)} />
              <InfoRow label="Abonos" value={formatCurrency(cierre.total_abonos)} />
              <InfoRow
                label="Efectivo esperado"
                value={formatCurrency(cierre.efectivo_esperado)}
              />
              <InfoRow label="Efectivo real" value={formatCurrency(cierre.efectivo_real)} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {editMode ? (
            <form className="rounded-[24px] border border-app bg-white/72 p-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="app-field">
                  <span className="app-field-label">Efectivo real</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.efectivo_real}
                    onChange={(event) =>
                      handleFieldChange('efectivo_real', event.target.value)
                    }
                    className="app-input min-h-11"
                  />
                </label>
                <label className="app-field md:col-span-2">
                  <span className="app-field-label">Observaciones</span>
                  <textarea
                    rows={3}
                    value={form.observaciones}
                    onChange={(event) =>
                      handleFieldChange('observaciones', event.target.value)
                    }
                    className="app-textarea min-h-[110px]"
                  />
                </label>
              </div>

              <div className="mt-4 space-y-4">
                {MANUAL_EXPENSE_FIELDS.map(([key, label]) => (
                  <div
                    key={key}
                    className="grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)]"
                  >
                    <label className="app-field">
                      <span className="app-field-label">{label}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.gastos[key].monto}
                        onChange={(event) =>
                          handleFieldChange(`gastos.${key}.monto`, event.target.value)
                        }
                        className="app-input min-h-11"
                      />
                    </label>
                    <label className="app-field">
                      <span className="app-field-label">Detalle</span>
                      <input
                        type="text"
                        value={form.gastos[key].descripcion}
                        onChange={(event) =>
                          handleFieldChange(
                            `gastos.${key}.descripcion`,
                            event.target.value,
                          )
                        }
                        className="app-input min-h-11"
                      />
                    </label>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="app-button-primary mt-5 min-h-11"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Guardando ajuste...' : 'Guardar ajuste'}
              </button>
            </form>
          ) : (
            <>
              <div className="rounded-[24px] border border-app bg-white/72 p-4">
                <div className="eyebrow">Gastos operativos</div>
                <div className="mt-4 space-y-3">
                  {buildExpenseRows(cierre.gastos_operativos).map((item) => (
                    <div
                      key={item.key}
                      className="rounded-[18px] border border-app bg-[var(--panel-soft)] px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[13px] font-semibold text-main">
                            {item.label}
                          </div>
                          <div className="mt-1 text-[12px] text-soft">
                            {item.descripcion || '--'}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-main">
                          {formatCurrency(item.monto)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-app bg-white/72 p-4">
                <div className="eyebrow">Ventas por categoria</div>
                <div className="mt-4 space-y-3">
                  {Object.entries(cierre.ventas_por_categoria || {}).map(
                    ([label, value]) => (
                      <InfoRow
                        key={label}
                        label={label}
                        value={formatCurrency(value)}
                      />
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-app bg-white/72 p-4">
                <div className="eyebrow">Observaciones</div>
                <div className="mt-3 text-[13px] leading-6 text-soft">
                  {cierre.observaciones || 'Sin observaciones registradas.'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="hidden">
        <ImprimirCierre cierre={cierre} />
      </div>
    </PanelShell>
  );
}

function InfoCard({ label, value, tone = 'neutral' }) {
  const toneClass =
    tone === 'success'
      ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
      : tone === 'danger'
        ? 'border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)]'
        : 'border-app bg-white/72';

  return (
    <div className={`rounded-[22px] border px-4 py-4 ${toneClass}`}>
      <div className="eyebrow">{label}</div>
      <div className="mt-3 font-display text-[1.7rem] leading-none text-main">
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-app bg-white/72 px-3 py-3">
      <div className="text-[13px] text-soft">{label}</div>
      <div className="text-[13px] font-semibold text-main">{value}</div>
    </div>
  );
}

function buildExpenseRows(gastosOperativos = {}) {
  return [
    {
      key: 'compras_mercancia',
      label: 'Compras de mercancia',
      monto: gastosOperativos?.compras_mercancia?.monto || 0,
      descripcion: getExpenseDescription(
        gastosOperativos?.compras_mercancia,
        'Facturas del dia incluidas en el cierre',
      ),
    },
    {
      key: 'servicios_publicos',
      label: 'Servicios publicos',
      monto: gastosOperativos?.servicios_publicos?.monto || 0,
      descripcion: getExpenseDescription(gastosOperativos?.servicios_publicos),
    },
    {
      key: 'arriendos',
      label: 'Arriendos',
      monto: gastosOperativos?.arriendos?.monto || 0,
      descripcion: getExpenseDescription(gastosOperativos?.arriendos),
    },
    {
      key: 'salarios',
      label: 'Salarios',
      monto: gastosOperativos?.salarios?.monto || 0,
      descripcion: getExpenseDescription(gastosOperativos?.salarios),
    },
    {
      key: 'otros_gastos',
      label: 'Otros gastos',
      monto: gastosOperativos?.otros_gastos?.monto || 0,
      descripcion: getExpenseDescription(gastosOperativos?.otros_gastos),
    },
  ];
}

function getExpenseDescription(expense, fallback = '') {
  if (!expense || typeof expense !== 'object') {
    return fallback || '';
  }

  if (expense.descripcion) {
    return expense.descripcion;
  }

  const detail = Array.isArray(expense.detalle) ? expense.detalle : [];
  const firstItem = detail[0];

  if (typeof firstItem === 'string') {
    return firstItem;
  }

  if (firstItem?.descripcion) {
    return firstItem.descripcion;
  }

  if (firstItem?.numero_factura) {
    return `Factura ${firstItem.numero_factura}`;
  }

  return fallback || '';
}
