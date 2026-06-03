import { createRoot } from 'react-dom/client';
import thermalTicketStyles from './thermalTicket.css?raw';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '../../utils/formatters';

export function printSoporteEmailFactura({ venta, empresa }) {
  if (!venta) {
    return false;
  }

  const popup = window.open('', '_blank', 'width=520,height=820');
  if (!popup) {
    return false;
  }

  const docNumber =
    venta.factura_documento?.bill_number
    || venta.numero_factura_electronica
    || venta.numero_venta;

  popup.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Soporte Email - ${docNumber}</title>
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
        <div id="soporte-print-root"></div>
      </body>
    </html>
  `);
  popup.document.close();

  const mountNode = popup.document.getElementById('soporte-print-root');
  const root = createRoot(mountNode);

  root.render(
    <SoporteEmailDocument venta={venta} empresa={empresa} />,
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

function SoporteEmailDocument({ venta, empresa }) {
  const cliente = venta.cliente;
  const detalles = venta.detalles || [];
  const docNumber =
    venta.factura_documento?.bill_number
    || venta.numero_factura_electronica
    || venta.numero_venta;

  const clienteEmail = cliente?.email || '';
  const clienteNombre = cliente?.nombre_completo || 'Consumidor Final';
  const clienteDocumento = cliente?.numero_documento || '222222222222';
  const clienteTelefono = cliente?.telefono || '';
  const vendedor =
    venta.usuario_registro?.full_name
    || venta.usuario_registro?.username
    || 'POS';

  const empresaNombre = empresa?.nombre_comercial || empresa?.razon_social || '';
  const empresaNit = empresa?.nit
    ? `NIT ${empresa.nit}${empresa.digito_verificacion ? `-${empresa.digito_verificacion}` : ''}`
    : '';

  return (
    <article className="thermal-ticket-sheet paper-80">

      {/* ── Encabezado empresa ── */}
      <header className="thermal-ticket__center">
        {empresa?.logo_url && (
          <div className="thermal-ticket__logo-wrap">
            <img
              src={empresa.logo_url}
              alt={empresaNombre}
              className="thermal-ticket__logo"
            />
          </div>
        )}
        <div className="thermal-ticket__brand">{empresaNombre}</div>
        <div className="thermal-ticket__meta">
          {empresaNit && <div>{empresaNit}</div>}
          {empresa?.direccion && <div>{empresa.direccion}</div>}
          {(empresa?.ciudad || empresa?.municipio_nombre) && (
            <div>{empresa.ciudad || empresa.municipio_nombre}</div>
          )}
          {empresa?.telefono && <div>Tel. {empresa.telefono}</div>}
        </div>
      </header>

      {/* ── Título del documento ── */}
      <section className="thermal-ticket__section thermal-ticket__center">
        <div className="thermal-ticket__brand" style={{ fontSize: '1em', letterSpacing: '0.04em' }}>
          SOPORTE DE AUTORIZACIÓN
        </div>
        <div className="thermal-ticket__brand" style={{ fontSize: '1em', letterSpacing: '0.04em' }}>
          DE ENTREGA POR CORREO
        </div>
        <div className="thermal-ticket__info-grid" style={{ marginTop: '8px' }}>
          <span className="thermal-ticket__label">Ref.</span>
          <span className="thermal-ticket__amount">{docNumber}</span>
          <span className="thermal-ticket__label">Fecha</span>
          <span className="thermal-ticket__amount">
            {formatDateTime(venta.fecha_facturacion || venta.fecha_venta)}
          </span>
        </div>
      </section>

      {/* ── Datos del adquirente ── */}
      <section className="thermal-ticket__section">
        <div className="thermal-ticket__section-title">Adquirente</div>
        <div className="thermal-ticket__info-grid">
          <span className="thermal-ticket__label">Cliente</span>
          <span className="thermal-ticket__amount">{clienteNombre}</span>
          <span className="thermal-ticket__label">C.C / NIT</span>
          <span className="thermal-ticket__amount">{clienteDocumento}</span>
          {clienteTelefono && (
            <>
              <span className="thermal-ticket__label">Telefono</span>
              <span className="thermal-ticket__amount">{clienteTelefono}</span>
            </>
          )}
          <span className="thermal-ticket__label">Vendedor</span>
          <span className="thermal-ticket__amount">{vendedor}</span>
        </div>
      </section>

      {/* ── Detalle de productos ── */}
      <section className="thermal-ticket__section">
        <div className="thermal-ticket__section-title">Detalle</div>
        <div className="thermal-ticket__products-header">
          <span>Item</span>
          <span className="thermal-ticket__amount">Cant</span>
          <span className="thermal-ticket__amount">Vr. Unit</span>
          <span className="thermal-ticket__amount">Valor</span>
        </div>
        {detalles.map((detalle, index) => (
          <div
            key={detalle.id || index}
            className="thermal-ticket__product-line"
          >
            <div className="thermal-ticket__product-name">
              {index + 1}.{' '}
              {detalle.producto?.nombre
                || detalle.producto_temporal_nombre
                || 'Producto'}
            </div>
            <div className="thermal-ticket__product-values">
              <span />
              <span className="thermal-ticket__amount">
                {formatNumber(detalle.cantidad)}
              </span>
              <span className="thermal-ticket__amount">
                {formatCurrency(detalle.precio_unitario)}
              </span>
              <span className="thermal-ticket__amount">
                {formatCurrency(detalle.total)}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Totales ── */}
      <section className="thermal-ticket__section">
        <div className="thermal-ticket__section-title">Totales</div>
        <div className="thermal-ticket__text-block">
          <div className="thermal-ticket__total-row">
            <span>Subtotal</span>
            <span>{formatCurrency(venta.subtotal)}</span>
          </div>
          {Number(venta.descuento) > 0 && (
            <div className="thermal-ticket__total-row">
              <span>Descuentos</span>
              <span>{formatCurrency(venta.descuento)}</span>
            </div>
          )}
          {Number(venta.impuestos) > 0 && (
            <div className="thermal-ticket__total-row">
              <span>IVA</span>
              <span>{formatCurrency(venta.impuestos)}</span>
            </div>
          )}
          <div className="thermal-ticket__total-row featured">
            <span>TOTAL</span>
            <span>{formatCurrency(venta.total)}</span>
          </div>
        </div>
      </section>

      {/* ── Constancia de autorización ── */}
      <section className="thermal-ticket__section">
        <div className="thermal-ticket__section-title">Constancia de entrega</div>
        {clienteEmail ? (
          <div className="thermal-ticket__legal">
            Usted ha autorizado que la entrega de la factura electronica de
            venta se realice al correo electronico:{' '}
            <strong>{clienteEmail}</strong>. Consulte su factura en el correo
            registrado una vez sea validada por la DIAN.
          </div>
        ) : (
          <div className="thermal-ticket__legal">
            El adquirente no registro correo electronico. La factura
            electronica estara disponible en el portal de consulta de la DIAN
            mediante el CUFE correspondiente.
          </div>
        )}
        <div className="thermal-ticket__legal" style={{ marginTop: '6px' }}>
          Este documento NO reemplaza la factura electronica de venta ni un
          documento equivalente. Es unicamente constancia de la autorizacion
          de entrega al medio senalado.
        </div>
        <div className="thermal-ticket__legal" style={{ marginTop: '6px' }}>
          Normativa: Art. 616-1 E.T. — Res. DIAN 042/2020.
        </div>
      </section>

      <footer className="thermal-ticket__footer">
        Fabricante de software y proveedor tecnologico: Mallor by Ciare Group
      </footer>
    </article>
  );
}
