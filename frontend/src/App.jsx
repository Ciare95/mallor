import './App.css';

function App() {
  const depsInstalled = true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Mallor <span className="text-blue-600">Frontend</span>
            </h1>
            <p className="text-lg text-gray-700 mb-6">
              Sistema de gestión integral para Pymes. Configuración inicial del frontend React con Vite.
            </p>

            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Estado de la configuración</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${depsInstalled ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-gray-700">Dependencias de React Router</span>
                  <span className="ml-2 text-sm font-medium px-2 py-1 rounded bg-gray-100">
                    {depsInstalled ? 'Instalado' : 'Pendiente'}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-3 bg-green-500"></div>
                  <span className="text-gray-700">Estructura de carpetas</span>
                  <span className="ml-2 text-sm font-medium px-2 py-1 rounded bg-green-100 text-green-800">
                    Completado
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-3 bg-green-500"></div>
                  <span className="text-gray-700">Configuración de Tailwind CSS</span>
                  <span className="ml-2 text-sm font-medium px-2 py-1 rounded bg-green-100 text-green-800">
                    Completado
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-3 bg-green-500"></div>
                  <span className="text-gray-700">Archivo de configuración de API</span>
                  <span className="ml-2 text-sm font-medium px-2 py-1 rounded bg-green-100 text-green-800">
                    Completado
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-semibold text-blue-800 mb-2">Próximos pasos</h3>
              <p className="text-blue-700 mb-4">
                Para completar la configuración del frontend, ejecuta los siguientes comandos:
              </p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                cd frontend<br/>
                npm install react-router-dom axios @tanstack/react-query zustand lucide-react
              </pre>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="https://vite.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Documentación de Vite
              </a>
              <a
                href="https://react.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition"
              >
                Documentación de React
              </a>
              <a
                href="https://tailwindcss.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition"
              >
                Documentación de Tailwind
              </a>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative">
              <div className="w-64 h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-6xl font-bold">M</div>
                  <div className="text-xl mt-2">Mallor</div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-400 rounded-full opacity-80"></div>
              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-green-400 rounded-full opacity-80"></div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center text-gray-600">
        <p>© 2025 Mallor - Sistema de Gestión de Pymes. Todos los derechos reservados.</p>
        <p className="text-sm mt-2">Esta es una configuración inicial. Las dependencias se instalarán próximamente.</p>
      </footer>
    </div>
  );
}

export default App;
