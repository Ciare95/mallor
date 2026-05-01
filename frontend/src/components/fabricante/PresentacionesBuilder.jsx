import {
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  buildPresentationMetrics,
  formatCostNote,
  unitLabel,
} from '../../utils/fabricante';
import { formatNumber } from '../../utils/formatters';

export default function PresentacionesBuilder({
  presentations,
  draftName,
  onChangeDraftName,
  draftQuantity,
  draftUnit,
  draftPrice,
  productUnitMeasure,
  productUnitCost,
  marginTarget,
  onSavePresentation,
  onEditPresentation,
  onRemovePresentation,
}) {
  const preview = buildPresentationMetrics({
    productUnitMeasure,
    productUnitCost,
    quantityPerUnit: draftQuantity,
    presentationUnitMeasure: draftUnit,
    price: draftPrice,
    marginTarget,
  });

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-app pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="eyebrow">Presentaciones</div>
          <h3 className="section-title mt-2">Salidas comerciales del lote</h3>
          <p className="body-copy mt-2 max-w-2xl">
            Define varios empaques para un mismo lote y calcula utilidad por
            cada formato de venta.
          </p>
        </div>

        <div className="app-pill">
          {presentations.length} presentacion
          {presentations.length !== 1 ? 'es' : ''}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
        <div className="space-y-4">
          <label className="app-field">
            <span className="app-field-label">Nombre de la presentacion</span>
            <input
              type="text"
              value={draftName}
              onChange={(event) => onChangeDraftName(event.target.value)}
              className="app-input min-h-11"
              placeholder="Envase 1 litro, Garrafa 3 litros..."
            />
          </label>

          <div className="rounded-xl border border-app bg-[var(--panel-soft)] p-4">
            <div className="eyebrow">Lectura actual</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MiniMetric
                label="Costo unitario"
                value={formatCostNote(preview.unitCost)}
              />
              <MiniMetric
                label="Sugerido"
                value={formatCostNote(preview.suggestedPrice)}
              />
              <MiniMetric
                label="Margen"
                value={formatCostNote(preview.margin)}
              />
              <MiniMetric
                label="Rentabilidad"
                value={`${formatNumber(preview.profitability, 2)} %`}
              />
            </div>
            {!preview.compatible && (
              <div className="mt-3 rounded-lg border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-3 py-2 text-[12px] text-[var(--warning-text)]">
                La unidad de esta presentacion debe ser compatible con la
                unidad base del lote.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onSavePresentation}
            disabled={!draftName.trim() || !preview.compatible}
            className="app-button-primary min-h-11 w-full"
          >
            <Plus className="h-4 w-4" />
            Guardar presentacion
          </button>
        </div>

        <div className="space-y-3">
          {presentations.length === 0 ? (
            <div className="empty-state min-h-[280px]">
              <PackageCheck className="mb-3 h-10 w-10 text-[var(--accent)]" />
              <div className="text-base font-semibold text-main">
                Aun no hay presentaciones.
              </div>
              <p className="body-copy mt-2 max-w-sm">
                Usa la calculadora para definir contenido, precio y formato de
                cada empaque vendible.
              </p>
            </div>
          ) : (
            presentations.map((presentation) => {
              const metrics = buildPresentationMetrics({
                productUnitMeasure,
                productUnitCost,
                quantityPerUnit: presentation.cantidad_por_unidad,
                presentationUnitMeasure: presentation.unidad_medida,
                price: presentation.precio_venta,
                marginTarget,
              });

              return (
                <article
                  key={presentation.id || presentation.local_id}
                  className="rounded-xl border border-app bg-white/76 p-4"
                >
                  <div className="flex flex-col gap-3 border-b border-app pb-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-main">
                        {presentation.nombre}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        {formatNumber(presentation.cantidad_por_unidad)}{' '}
                        {unitLabel(presentation.unidad_medida)} por unidad
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditPresentation(presentation)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-2 text-[11px] font-semibold text-soft transition hover:bg-white hover:text-main"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemovePresentation(presentation)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-2 text-[11px] font-semibold text-[var(--danger-text)] transition hover:bg-[var(--danger-soft)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                    <MiniMetric
                      label="Precio venta"
                      value={formatCostNote(presentation.precio_venta)}
                    />
                    <MiniMetric
                      label="Costo unitario"
                      value={formatCostNote(
                        presentation.costo_unitario_presentacion ||
                          metrics.unitCost,
                      )}
                    />
                    <MiniMetric
                      label="Margen"
                      value={formatCostNote(
                        presentation.margen_utilidad || metrics.margin,
                      )}
                    />
                    <MiniMetric
                      label="Rentabilidad"
                      value={`${
                        formatNumber(
                          presentation.porcentaje_utilidad ||
                            metrics.profitability,
                          2,
                        )
                      } %`}
                    />
                  </div>

                  {presentation.producto_inventario_detalle?.nombre && (
                    <div className="mt-3 text-[12px] text-soft">
                      Vinculado a inventario como{' '}
                      <strong>
                        {presentation.producto_inventario_detalle.nombre}
                      </strong>
                      .
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-app bg-white/72 px-3.5 py-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-[13px] font-semibold text-main">{value}</div>
    </div>
  );
}
