import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Printer } from 'lucide-react';
import thermalTicketStyles from './thermalTicket.css?raw';
import {
  calculateVentaTotals,
  CONSUMIDOR_FINAL,
} from '../../utils/ventas';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from '../../utils/formatters';

export const DEFAULT_TICKET_SETTINGS = {
  paperWidth: '80',
  showLogo: true,
  copies: 1,
  footerText: '',
};

export const PAPER_OPTIONS = [
  { value: '58', label: '58mm' },
  { value: '80', label: '80mm' },
];

const PAYMENT_METHOD_LABELS = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CREDITO: 'Credito',
};

const LEGAL_TEXT_ELECTRONIC =
  'No responsable de IVA - Actividad economica 4752. A esta nota de credito aplican las normas relativas a la letra de cambio (articulo 5 Ley 1231 de 2008). Con esta el Comprador declara haber recibido real y materialmente las mercancias o prestacion de servicios descritos en este titulo valor.';
const LEGAL_TEXT_STANDARD =
  'Esta factura se asimila a una letra de cambio Art. 774 del codigo de comercio';

const SOFTWARE_FOOTER =
  'Fabricante de software y proveedor tecnologico: Mallor by Ciare Group';

function clampCopies(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.min(Math.max(numeric, 1), 5);
}

function normalizeSettings(settings = {}) {
  return {
    paperWidth: settings.paperWidth === '58' ? '58' : '80',
    showLogo: settings.showLogo !== false,
    copies: clampCopies(settings.copies),
    footerText: String(settings.footerText ?? settings.ticket_footer_text ?? ''),
  };
}

function toSentenceCase(value) {
  if (!value) {
    return '';
  }
  const normalized = String(value).toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getCompanyName(empresa) {
  return empresa?.nombre_comercial || empresa?.razon_social || 'Mallor';
}

function getCompanyNit(empresa) {
  if (!empresa?.nit) {
    return '';
  }
  return `NIT ${empresa.nit}${empresa.digito_verificacion ? `-${empresa.digito_verificacion}` : ''}`;
}

function getCompanyCity(empresa) {
  return empresa?.ciudad || empresa?.municipio_nombre || empresa?.municipio_codigo || '';
}

function resolveLogoSource(empresa, settings) {
  if (!settings.showLogo) {
    return null;
  }
  return empresa?.logo_url || empresa?.logo || null;
}

function mapPaymentForm(method) {
  return method === 'CREDITO' ? 'Credito' : 'Contado';
}

function getSafeClient(cliente) {
  return cliente || CONSUMIDOR_FINAL;
}

function getCustomerAddress(cliente, factura) {
  return (
    cliente?.direccion
    || factura?.request_payload?.customer?.address
    || factura?.response_payload?.data?.customer?.address
    || 'Sin direccion'
  );
}

function getCustomerPhone(cliente, factura) {
  return (
    cliente?.telefono
    || factura?.request_payload?.customer?.phone
    || factura?.response_payload?.data?.customer?.phone
    || 'Sin telefono'
  );
}

function buildTaxLines(detalles = []) {
  const grouped = new Map();

  detalles.forEach((detalle) => {
    const rate = Number(detalle.producto?.iva ?? 0);
    const taxAmount = Number(detalle.iva || 0);
    const subtotal = Number(detalle.subtotal || 0);
    const descuento = Number(detalle.descuento || 0);
    const base = Math.max(subtotal - descuento, 0);

    if (taxAmount <= 0 && rate <= 0) {
      return;
    }

    const key = `${rate}`;
    const current = grouped.get(key) || {
      id: '01',
      rate,
      base: 0,
      value: 0,
    };
    current.base += base;
    current.value += taxAmount;
    grouped.set(key, current);
  });

  return [...grouped.values()];
}

function getNestedValue(source, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], source);
}

function isDataUrl(value = '') {
  return /^data:image\/[a-zA-Z+.-]+;base64,/.test(String(value).trim());
}

function svgToDataUrl(svg = '') {
  const normalized = String(svg || '').trim();
  if (!normalized) {
    return null;
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(normalized)}`;
}

function looksLikeRawBase64(value = '') {
  const normalized = String(value).trim();
  return (
    normalized.length > 80
    && !normalized.includes(' ')
    && /^[A-Za-z0-9+/=]+$/.test(normalized)
  );
}

function isImageUrl(value = '') {
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(String(value).trim());
}

function buildQrImageSource(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }
  if (isDataUrl(normalized)) {
    return normalized;
  }
  if (looksLikeRawBase64(normalized)) {
    return `data:image/png;base64,${normalized}`;
  }
  if (isImageUrl(normalized)) {
    return normalized;
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(normalized)}`;
}

function extractQrSource(factura) {
  if (factura?.qr_svg) {
    return svgToDataUrl(factura.qr_svg);
  }

  const persistedQrPayload = factura?.qr_payload || {};
  const persistedValue = (
    persistedQrPayload.value
    || persistedQrPayload.source_url
    || persistedQrPayload.public_url
  );
  if (persistedValue) {
    return buildQrImageSource(persistedValue);
  }

  const payload = factura?.response_payload?.data || factura?.response_payload || {};
  const candidates = [
    payload.qr_image,
    payload.qr,
    payload.qr_code,
    payload.qr_data_url,
    payload.qr_url,
    payload.links?.qr,
    payload.links?.public_url,
    getNestedValue(payload, 'bill.qr'),
    getNestedValue(payload, 'bill.links.qr'),
    getNestedValue(payload, 'invoice.qr'),
    getNestedValue(payload, 'invoice.links.qr'),
  ];
  const firstMatch = candidates.find(Boolean);
  return buildQrImageSource(firstMatch);
}

function buildResolutionSection(factura) {
  const range = factura?.numbering_range;
  return {
    authorizationNumber:
      factura?.resolution_number || range?.resolution_number || '',
    approvalDate: range?.start_date || '',
    prefix: range?.prefix || '',
    authorizedRange:
      range?.from_number && range?.to_number
        ? `${range.from_number} - ${range.to_number}`
        : '',
    validity: range?.end_date || '',
  };
}

export function buildPreviewVentaFromDraft(draft = {}, empresa = null) {
  const totals = calculateVentaTotals(draft);
  const cliente = getSafeClient(draft.clienteSeleccionado);

  return {
    id: `preview-${Date.now()}`,
    numero_venta: 'PREVIEW-POS',
    cliente,
    fecha_venta: new Date().toISOString(),
    subtotal: totals.subtotal,
    descuento: totals.descuentoGlobal + totals.descuentoLineas,
    impuestos: totals.impuestos,
    total: totals.total,
    estado: draft.estado || 'TERMINADA',
    total_abonado:
      draft.metodoPago === 'CREDITO'
        ? Number(draft.abonoInicial || 0)
        : Number(totals.efectivoRecibido || 0),
    saldo_pendiente: totals.saldoCredito,
    metodo_pago: draft.metodoPago || 'EFECTIVO',
    factura_electronica: Boolean(draft.facturaElectronica),
    numero_factura_electronica: '',
    fecha_facturacion: '',
    observaciones: draft.observaciones || '',
    usuario_registro: empresa?.usuario_registro || null,
    detalles: totals.lines.map((item, index) => ({
      id: item.id || `preview-line-${index + 1}`,
      producto: item.producto,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      descuento: item.descuento,
      iva: item.impuestos,
      total: item.total,
    })),
    factura_documento: draft.facturaElectronica
      ? {
          status: 'PENDIENTE',
          bill_number: '',
          cufe: 'CUFE disponible al emitir',
          resolution_number: '',
          numbering_range: null,
          response_payload: {},
        }
      : null,
  };
}

export function buildThermalTicketData({
  venta,
  empresa,
  draft = null,
  settings = DEFAULT_TICKET_SETTINGS,
}) {
  if (!venta) {
    return null;
  }

  const normalizedSettings = normalizeSettings(settings);
  const factura = venta.factura_documento || null;
  const isElectronic = Boolean(venta.factura_electronica);
  const isPendingElectronic =
    isElectronic &&
    (
      venta.invoice_status === 'PENDIENTE_FACTURACION' ||
      factura?.status === 'PENDIENTE_FACTURACION' ||
      factura?.status === 'PENDIENTE_ENVIO'
    ) &&
    factura?.status !== 'EMITIDA';
  const cliente = getSafeClient(venta.cliente);
  const detalles = venta.detalles || [];
  const lineDiscounts = detalles.reduce(
    (acc, item) => acc + Number(item.descuento || 0),
    0,
  );
  const globalDiscount = Number(venta.descuento || 0);
  const grossTotal = detalles.reduce(
    (acc, item) => acc + Number(item.subtotal || 0) + Number(item.iva || 0),
    0,
  );
  const discounts = lineDiscounts + globalDiscount;
  const subtotalToPay = Math.max(grossTotal - discounts, 0);
  const totals = {
    gross: grossTotal,
    discounts,
    subtotal: subtotalToPay,
    total: Number(venta.total || subtotalToPay),
  };

  const paymentInfo = {
    paymentForm: mapPaymentForm(venta.metodo_pago),
    paymentMethod:
      PAYMENT_METHOD_LABELS[venta.metodo_pago] || toSentenceCase(venta.metodo_pago),
    totalReceived:
      venta.metodo_pago === 'CREDITO'
        ? Number(draft?.abonoInicial || venta.total_abonado || 0)
        : Number(
            draft?.efectivoRecibido
            ?? venta.total_abonado
            ?? venta.total
            ?? 0,
          ),
    change:
      venta.metodo_pago === 'CREDITO'
        ? 0
        : Math.max(
            Number(
              draft?.efectivoRecibido
              ?? venta.total_abonado
              ?? venta.total
              ?? 0,
            ) - totals.total,
            0,
          ),
  };

  return {
    settings: normalizedSettings,
    logoSrc: resolveLogoSource(empresa, normalizedSettings),
    company: {
      name: getCompanyName(empresa),
      nit: getCompanyNit(empresa),
      address: empresa?.direccion || '',
      city: getCompanyCity(empresa),
      phone: empresa?.telefono || '',
    },
    invoice: {
      title: isPendingElectronic
        ? 'Prefactura interna'
        : isElectronic
          ? 'Factura electronica de venta'
          : 'Factura de venta',
      number:
        (isPendingElectronic ? venta.prefactura_numero : '')
        || factura?.bill_number
        || venta.numero_factura_electronica
        || venta.numero_venta,
      dateTime: venta.fecha_facturacion || venta.fecha_venta,
      resolutionSummary:
        isElectronic
          ? (
              factura?.resolution_number
              || factura?.numbering_range?.resolution_number
              || ''
            )
          : '',
    },
    customer: {
      name: cliente?.nombre_completo || 'Consumidor Final',
      document: [
        cliente?.tipo_documento || 'CC',
        cliente?.numero_documento || '',
      ].filter(Boolean).join(' / '),
      address: getCustomerAddress(cliente, factura),
      phone: getCustomerPhone(cliente, factura),
      seller:
        venta.usuario_registro?.full_name
        || venta.usuario_registro?.username
        || 'POS',
    },
    items: detalles.map((detalle, index) => ({
      id: detalle.id || `line-${index + 1}`,
      itemNumber: index + 1,
      name: detalle.producto?.nombre || 'Producto',
      code:
        detalle.producto?.codigo_interno_formateado
        || detalle.producto?.codigo_interno
        || detalle.producto?.codigo_barras
        || '',
      quantity: formatNumber(detalle.cantidad || 0),
      unitPrice: formatCurrency(detalle.precio_unitario || 0),
      total: formatCurrency(detalle.total || 0),
    })),
    taxes: buildTaxLines(detalles),
    totals,
    paymentInfo,
    isElectronic,
    isPendingElectronic,
    electronicBilling: {
      cufe: isPendingElectronic
        ? 'Pendiente de emision con Factus'
        : factura?.cufe || 'Pendiente de emision',
      qrSrc: extractQrSource(factura),
    },
    legalText: isPendingElectronic
      ? 'Documento interno pendiente de emision electronica. No reemplaza factura electronica validada por DIAN.'
      : isElectronic ? LEGAL_TEXT_ELECTRONIC : LEGAL_TEXT_STANDARD,
    resolution: buildResolutionSection(factura),
    softwareFooter: SOFTWARE_FOOTER,
    footerText: normalizedSettings.footerText,
    observations: venta.observaciones || '',
  };
}

function TicketSection({ title, children }) {
  return (
    <section className="thermal-ticket__section">
      {title ? (
        <div className="thermal-ticket__section-title">{title}</div>
      ) : null}
      {children}
    </section>
  );
}

function QrBlock({ qrSrc }) {
  return (
    <div className="thermal-ticket__center">
      <div className="thermal-ticket__qr">
        {qrSrc ? (
          <img src={qrSrc} alt="Codigo QR de la factura" />
        ) : (
          <div className="thermal-ticket__qr-fallback">
            <span>QR listo</span>
            <span>cuando llegue</span>
            <span>desde backend</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ThermalTicketDocument({
  ticket,
  settings = DEFAULT_TICKET_SETTINGS,
  preview = false,
}) {
  if (!ticket) {
    return null;
  }

  const normalizedSettings = normalizeSettings({
    ...ticket.settings,
    ...settings,
  });

  return (
    <div className="thermal-ticket-document">
      {Array.from({ length: normalizedSettings.copies }).map((_, index) => (
        <div
          key={`copy-${index + 1}`}
          className="thermal-ticket-page-break"
        >
          <ThermalTicket
            ticket={ticket}
            settings={normalizedSettings}
            preview={preview}
            copyIndex={index}
            totalCopies={normalizedSettings.copies}
          />
        </div>
      ))}
    </div>
  );
}

export function ThermalTicket({
  ticket,
  settings = DEFAULT_TICKET_SETTINGS,
  preview = false,
  copyIndex = 0,
  totalCopies = 1,
}) {
  const { company, invoice, customer, items, taxes, totals, paymentInfo, electronicBilling, isElectronic, isPendingElectronic } =
    ticket;

  return (
    <article
      className={`thermal-ticket-sheet paper-${settings.paperWidth} ${preview ? 'preview' : ''}`}
    >
      {totalCopies > 1 && (
        <div className="thermal-ticket-copy-tag">
          Copia {copyIndex + 1} / {totalCopies}
        </div>
      )}

      <header className="thermal-ticket__center">
        {ticket.logoSrc && (
          <div className="thermal-ticket__logo-wrap">
            <img
              src={ticket.logoSrc}
              alt={`Logo ${company.name}`}
              className="thermal-ticket__logo"
            />
          </div>
        )}
        <div className="thermal-ticket__brand">{company.name}</div>
        <div className="thermal-ticket__meta">
          {company.nit && <div>{company.nit}</div>}
          {company.address && <div>{company.address}</div>}
          {company.city && <div>{company.city}</div>}
          {company.phone && <div>Tel. {company.phone}</div>}
        </div>
      </header>

      <TicketSection>
        <div className="thermal-ticket__center">
          <div className="thermal-ticket__brand">{invoice.title}</div>
        </div>
        <div className="thermal-ticket__info-grid">
          <span className="thermal-ticket__label">Numero</span>
          <span className="thermal-ticket__amount">{invoice.number}</span>
          <span className="thermal-ticket__label">Fecha y hora</span>
          <span className="thermal-ticket__amount">
            {formatDateTime(invoice.dateTime)}
          </span>
          {invoice.resolutionSummary && (
            <>
              <span className="thermal-ticket__label">Resolucion</span>
              <span className="thermal-ticket__amount">
                {invoice.resolutionSummary}
              </span>
            </>
          )}
        </div>
      </TicketSection>

      <TicketSection>
        <div className="thermal-ticket__info-grid">
          <span className="thermal-ticket__label">Cliente</span>
          <span className="thermal-ticket__amount">{customer.name}</span>
          <span className="thermal-ticket__label">C.C / NIT</span>
          <span className="thermal-ticket__amount">{customer.document}</span>
          <span className="thermal-ticket__label">Direccion</span>
          <span className="thermal-ticket__amount">{customer.address}</span>
          <span className="thermal-ticket__label">Telefono</span>
          <span className="thermal-ticket__amount">{customer.phone}</span>
          <span className="thermal-ticket__label">Vendedor</span>
          <span className="thermal-ticket__amount">{customer.seller}</span>
        </div>
      </TicketSection>

      <TicketSection title="Productos">
        <div className="thermal-ticket__products-header">
          <span>Item</span>
          <span className="thermal-ticket__amount">Cant</span>
          <span className="thermal-ticket__amount">Vr. Unit</span>
          <span className="thermal-ticket__amount">Valor</span>
        </div>
        <div>
          {items.map((item) => (
            <div key={item.id} className="thermal-ticket__product-line">
              <div className="thermal-ticket__product-name">
                {item.itemNumber}. {item.name}
              </div>
              {item.code && (
                <div className="thermal-ticket__product-meta">{item.code}</div>
              )}
              <div className="thermal-ticket__product-values">
                <span />
                <span className="thermal-ticket__amount">{item.quantity}</span>
                <span className="thermal-ticket__amount">{item.unitPrice}</span>
                <span className="thermal-ticket__amount">{item.total}</span>
              </div>
            </div>
          ))}
        </div>
      </TicketSection>

      {taxes.length > 0 && (
        <TicketSection title="Impuestos">
          <div className="thermal-ticket__tax-header">
            <span>ID</span>
            <span className="thermal-ticket__amount">%</span>
            <span className="thermal-ticket__amount">Base</span>
            <span className="thermal-ticket__amount">Valor</span>
          </div>
          <div className="thermal-ticket__text-block">
            {taxes.map((tax) => (
              <div
                key={`${tax.id}-${tax.rate}`}
                className="thermal-ticket__tax-row"
              >
                <span>{tax.id}</span>
                <span className="thermal-ticket__amount">
                  {formatNumber(tax.rate)}
                </span>
                <span className="thermal-ticket__amount">
                  {formatCurrency(tax.base)}
                </span>
                <span className="thermal-ticket__amount">
                  {formatCurrency(tax.value)}
                </span>
              </div>
            ))}
          </div>
        </TicketSection>
      )}

      <TicketSection title="Totales">
        <div className="thermal-ticket__text-block">
          <div className="thermal-ticket__total-row">
            <span>Total bruto</span>
            <span>{formatCurrency(totals.gross)}</span>
          </div>
          <div className="thermal-ticket__total-row">
            <span>Descuentos</span>
            <span>{formatCurrency(totals.discounts)}</span>
          </div>
          <div className="thermal-ticket__total-row">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="thermal-ticket__total-row featured">
            <span>TOTAL A PAGAR</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </TicketSection>

      <TicketSection title="Pago">
        <div className="thermal-ticket__text-block">
          <div className="thermal-ticket__payment-row">
            <span>Forma de pago</span>
            <span>{paymentInfo.paymentForm}</span>
          </div>
          <div className="thermal-ticket__payment-row">
            <span>Metodo de pago</span>
            <span>{paymentInfo.paymentMethod}</span>
          </div>
          <div className="thermal-ticket__payment-row">
            <span>Total recibido</span>
            <span>{formatCurrency(paymentInfo.totalReceived)}</span>
          </div>
          <div className="thermal-ticket__payment-row">
            <span>Cambio</span>
            <span>{formatCurrency(paymentInfo.change)}</span>
          </div>
        </div>
      </TicketSection>

      {isElectronic ? (
        <TicketSection title="Facturacion electronica">
          {isPendingElectronic && (
            <div className="thermal-ticket__legal">
              Pendiente de emision oficial cuando vuelva la conexion.
            </div>
          )}
          <div className="thermal-ticket__text-block thermal-ticket__cufe-section">
            <div className="thermal-ticket__label">CUFE</div>
            <div className="thermal-ticket__cufe-value">
              {electronicBilling.cufe}
            </div>
          </div>
          <QrBlock
            qrSrc={electronicBilling.qrSrc}
          />
        </TicketSection>
      ) : null}

      <TicketSection>
        <div className="thermal-ticket__legal">{ticket.legalText}</div>
      </TicketSection>

      {isElectronic ? (
        <TicketSection>
          <div className="thermal-ticket__info-grid">
            <span className="thermal-ticket__label">Numero autorizacion</span>
            <span className="thermal-ticket__amount">
              {ticket.resolution.authorizationNumber || 'Pendiente'}
            </span>
            <span className="thermal-ticket__label">Fecha aprobacion</span>
            <span className="thermal-ticket__amount">
              {ticket.resolution.approvalDate
                ? formatDate(ticket.resolution.approvalDate)
                : 'Pendiente'}
            </span>
            <span className="thermal-ticket__label">Prefijo POS</span>
            <span className="thermal-ticket__amount">
              {ticket.resolution.prefix || 'POS'}
            </span>
            <span className="thermal-ticket__label">Rango autorizado</span>
            <span className="thermal-ticket__amount">
              {ticket.resolution.authorizedRange || 'Pendiente'}
            </span>
            <span className="thermal-ticket__label">Vigencia</span>
            <span className="thermal-ticket__amount">
              {ticket.resolution.validity
                ? formatDate(ticket.resolution.validity)
                : 'Pendiente'}
            </span>
          </div>
        </TicketSection>
      ) : null}

      {ticket.observations && (
        <TicketSection title="Observaciones">
          <div className="thermal-ticket__legal">{ticket.observations}</div>
        </TicketSection>
      )}

      {ticket.footerText && (
        <TicketSection>
          <div className="thermal-ticket__custom-footer">
            {ticket.footerText}
          </div>
        </TicketSection>
      )}

      <footer className="thermal-ticket__footer">
        {ticket.softwareFooter}
      </footer>
    </article>
  );
}

export function printThermalTicket({
  venta,
  empresa,
  draft = null,
  settings = DEFAULT_TICKET_SETTINGS,
}) {
  if (!venta) {
    return false;
  }

  const ticket = buildThermalTicketData({
    venta,
    empresa,
    draft,
    settings,
  });
  const popup = window.open('', '_blank', 'width=520,height=780');

  if (!popup) {
    return false;
  }

  popup.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Tirilla ${ticket.invoice.number}</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          ${thermalTicketStyles}
        </style>
      </head>
      <body>
        <div id="thermal-print-root"></div>
      </body>
    </html>
  `);
  popup.document.close();

  const mountNode = popup.document.getElementById('thermal-print-root');
  const root = createRoot(mountNode);

  root.render(
    <ThermalTicketDocument
      ticket={ticket}
      settings={settings}
    />,
  );

  window.setTimeout(() => {
    popup.focus();
    popup.print();
    window.setTimeout(() => {
      root.unmount();
    }, 500);
  }, 450);

  return true;
}

function TicketSettingsFields({ settings, onChange }) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.9fr]">
      <label className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          Tamano de papel
        </span>
        <select
          value={settings.paperWidth}
          onChange={(event) =>
            onChange({
              ...settings,
              paperWidth: event.target.value,
            })
          }
          className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-[14px] font-semibold text-slate-50 outline-none transition focus:border-sky-400"
        >
          {PAPER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          Copias
        </span>
        <input
          type="number"
          min="1"
          max="5"
          value={settings.copies}
          onChange={(event) =>
            onChange({
              ...settings,
              copies: clampCopies(event.target.value),
            })
          }
          className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-[14px] font-semibold text-slate-50 outline-none transition focus:border-sky-400"
        />
      </label>

      <button
        type="button"
        onClick={() =>
          onChange({
            ...settings,
            showLogo: !settings.showLogo,
          })
        }
        className="mt-[26px] flex min-h-11 items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-slate-50">
          Mostrar logo
        </span>
        <span
          className={`inline-flex h-7 w-14 items-center rounded-full p-1 transition ${
            settings.showLogo ? 'bg-sky-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white transition ${
              settings.showLogo ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </span>
      </button>
    </div>
  );
}

export function ThermalTicketPreviewModal({
  open,
  onClose,
  venta = null,
  draft = null,
  empresa = null,
  initialSettings = DEFAULT_TICKET_SETTINGS,
  onSettingsChange = null,
  onPrint = null,
}) {
  const [settings, setSettings] = useState(normalizeSettings(initialSettings));

  useEffect(() => {
    if (!open) {
      return;
    }
    setSettings(normalizeSettings(initialSettings));
  }, [initialSettings, open]);

  const updateSettings = (nextSettings) => {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    onSettingsChange?.(normalized);
  };

  const sourceVenta = useMemo(() => {
    if (venta) {
      return venta;
    }
    if (draft) {
      return buildPreviewVentaFromDraft(draft, empresa);
    }
    return null;
  }, [draft, empresa, venta]);

  const ticket = useMemo(
    () =>
      buildThermalTicketData({
        venta: sourceVenta,
        empresa,
        draft,
        settings,
      }),
    [draft, empresa, settings, sourceVenta],
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa de tirilla termica"
    >
      <style>{thermalTicketStyles}</style>
      <div className="thermal-ticket-modal">
        <div className="thermal-ticket-modal__header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="thermal-ticket-modal__eyebrow">Impresion termica</div>
              <h3 className="thermal-ticket-modal__title">Formato de tirilla</h3>
            </div>

            <div className="thermal-ticket-modal__header-actions">
              <button
                type="button"
                onClick={() => {
                  if (!sourceVenta) {
                    return;
                  }
                  const printed = printThermalTicket({
                    venta: sourceVenta,
                    empresa,
                    draft,
                    settings,
                  });
                  if (printed) {
                    onPrint?.(settings);
                  }
                }}
                className="app-button-primary min-h-10"
              >
                <Printer className="h-4 w-4" />
                Imprimir tirilla
              </button>
              <button
                type="button"
                onClick={onClose}
                className="app-button-secondary min-h-10"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>

        <div className="thermal-ticket-modal__body">
          <aside className="thermal-ticket-modal__sidebar">
            <div className="thermal-ticket-modal__panel">
              <div className="thermal-ticket-modal__panel-title">
                Configuracion de impresion
              </div>
              <div className="thermal-ticket-modal__panel-copy">
                El formato se aplica a esta impresion. En 58mm se compactan las
                columnas; en 80mm se abre la respiracion visual.
              </div>
              <div className="mt-4">
                <TicketSettingsFields
                  settings={settings}
                  onChange={updateSettings}
                />
              </div>
            </div>

            <div className="thermal-ticket-modal__hint">
              Usa el scroll del panel derecho para revisar la tirilla completa.
              El bloque de totales, CUFE y QR se mantiene con alto contraste
              para evitar que el texto se pierda sobre fondos claros.
            </div>
          </aside>

          <section className="thermal-ticket-modal__preview">
            <div className="thermal-ticket-modal__preview-bar">
              <div>
                <div className="thermal-ticket-modal__preview-title">
                  Vista previa
                </div>
              </div>
              <div className="thermal-ticket-modal__preview-size">
                Papel {settings.paperWidth}mm
              </div>
            </div>

            <div className="thermal-ticket-modal__preview-scroll">
              <div className="thermal-ticket-preview-shell rounded-[24px] border border-[rgba(15,23,42,0.08)] p-6">
                {ticket ? (
                  <ThermalTicketDocument
                    ticket={ticket}
                    settings={settings}
                    preview
                  />
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-[13px] text-slate-600">
                    No hay datos suficientes para construir la tirilla.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
