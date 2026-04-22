export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Acerca de Mallor</h1>
      <div className="prose prose-lg">
        <p className="text-gray-700">
          Mallor es un sistema de gestión integral diseñado específicamente para medianas y pequeñas empresas,
          que combina control de inventario, ventas, clientes y proveedores en una sola plataforma.
        </p>
        <h2 className="text-2xl font-semibold text-gray-800 mt-8">Características principales</h2>
        <ul className="list-disc pl-6 text-gray-700">
          <li>Gestión completa de inventario con control de stock y caducidad</li>
          <li>Punto de venta con soporte para múltiples métodos de pago</li>
          <li>Sistema de abonos y control de cuentas por cobrar</li>
          <li>Gestión de clientes con historial de compras</li>
          <li>Control de proveedores y facturas de compra</li>
          <li>Reportes y estadísticas en tiempo real</li>
          <li>Integración con facturación electrónica</li>
        </ul>
      </div>
    </div>
  );
}