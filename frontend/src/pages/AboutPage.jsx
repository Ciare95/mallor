export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <section className="surface px-6 py-6 sm:px-7">
        <div className="eyebrow">Acerca de Mallor</div>
        <h1 className="mt-3 max-w-3xl font-display text-[2.7rem] leading-[0.96] text-main">
          Un sistema operativo comercial para inventario, ventas y cartera.
        </h1>
        <p className="mt-4 max-w-3xl text-[13px] leading-6 text-soft">
          Mallor integra operacion de mostrador, control de existencias,
          seguimiento de clientes y relacion con proveedores dentro de una
          misma capa de trabajo.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            'Gestion completa de inventario con control de stock y movimientos.',
            'Punto de venta con multiples metodos de pago y continuidad operativa.',
            'Sistema de abonos y seguimiento de cuentas por cobrar.',
            'Perfil comercial de clientes con historial y comportamiento.',
            'Control de proveedores y trazabilidad de compras.',
            'Reportes y soporte para facturacion electronica.',
          ].map((item) => (
            <div key={item} className="surface-subtle px-4 py-4 text-[13px] leading-6 text-soft">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
