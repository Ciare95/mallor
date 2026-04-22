export default function HomePage() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">Bienvenido a Mallor</h1>
      <p className="text-lg text-gray-600 mb-8">
        Sistema de gestión integral para Pymes
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Inventario</h3>
          <p className="text-gray-600">Gestión completa de productos y stock</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Ventas</h3>
          <p className="text-gray-600">Punto de venta y control de abonos</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Clientes</h3>
          <p className="text-gray-600">Gestión de clientes y cartera</p>
        </div>
      </div>
    </div>
  );
}