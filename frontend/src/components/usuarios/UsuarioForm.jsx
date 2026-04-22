import { useState, useEffect } from 'react';
import { User, Mail, Lock, Phone, Shield, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

/**
 * Componente de formulario para crear o editar usuarios.
 * 
 * Características:
 * - Validación en tiempo real
 * - Campos requeridos con indicadores
 * - Validación de formato de email
 * - Validación de fortaleza de contraseña
 * - Modo creación vs edición
 * - Estados de carga y error
 * 
 * @param {Object} props
 * @param {Object} props.usuario - Usuario a editar (opcional, para modo edición)
 * @param {Function} props.onSubmit - Callback al enviar formulario
 * @param {Function} props.onCancel - Callback al cancelar
 * @param {boolean} props.isLoading - Estado de carga del envío
 * @param {string} props.error - Mensaje de error del envío
 * @returns {JSX.Element} Componente de formulario de usuario
 */
const UsuarioForm = ({ usuario, onSubmit, onCancel, isLoading, error }) => {
  // Estado del formulario
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'EMPLEADO',
  });

  // Estado de validación
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Inicializar con datos de usuario si está en modo edición
  useEffect(() => {
    if (usuario) {
      setFormData({
        username: usuario.username || '',
        email: usuario.email || '',
        password: '',
        confirmPassword: '',
        first_name: usuario.first_name || '',
        last_name: usuario.last_name || '',
        phone: usuario.phone || '',
        role: usuario.role || 'EMPLEADO',
      });
    }
  }, [usuario]);

  // Validaciones
  const validaciones = {
    username: (value) => {
      if (!value.trim()) return 'El nombre de usuario es requerido';
      if (value.length < 3) return 'Mínimo 3 caracteres';
      if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Solo letras, números y guión bajo';
      return null;
    },
    email: (value) => {
      if (!value.trim()) return 'El email es requerido';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email inválido';
      return null;
    },
    password: (value) => {
      if (!usuario && !value) return 'La contraseña es requerida';
      if (value && value.length < 8) return 'Mínimo 8 caracteres';
      if (value && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return 'Debe contener minúsculas, mayúsculas y números';
      }
      return null;
    },
    confirmPassword: (value) => {
      if (!usuario && !value) return 'Confirma la contraseña';
      if (value !== formData.password) return 'Las contraseñas no coinciden';
      return null;
    },
    first_name: (value) => {
      if (!value.trim()) return 'El nombre es requerido';
      return null;
    },
    last_name: (value) => {
      if (!value.trim()) return 'El apellido es requerido';
      return null;
    },
    phone: (value) => {
      if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) return 'Teléfono inválido';
      return null;
    },
  };

  // Manejar cambios en los campos
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validar inmediatamente si el campo ha sido tocado
    if (touched[name]) {
      const error = validaciones[name] ? validaciones[name](value) : null;
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  // Manejar blur (campo tocado)
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validaciones[name] ? validaciones[name](value) : null;
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Validar todo el formulario
  const validateForm = () => {
    const newErrors = {};
    const newTouched = {};
    
    Object.keys(formData).forEach(field => {
      newTouched[field] = true;
      if (validaciones[field]) {
        const error = validaciones[field](formData[field]);
        if (error) newErrors[field] = error;
      }
    });
    
    setTouched(newTouched);
    setErrors(newErrors);
    
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Preparar datos para enviar
    // - El backend espera 'confirm_password' (snake_case), no 'confirmPassword' (camelCase)
    // - En edición, eliminar password/confirm_password si no se cambió
    const { confirmPassword, ...rest } = formData;
    const datosEnviar = { ...rest };

    if (usuario) {
      // Modo edición: no enviar password ni confirm_password
      delete datosEnviar.password;
    } else {
      // Modo creación: incluir confirm_password (requerido por el backend)
      datosEnviar.confirm_password = confirmPassword;
    }

    onSubmit(datosEnviar);
  };

  // Calcular fortaleza de contraseña
  const calcularFortalezaPassword = (password) => {
    if (!password) return 0;
    let fortaleza = 0;
    if (password.length >= 8) fortaleza += 1;
    if (/[a-z]/.test(password)) fortaleza += 1;
    if (/[A-Z]/.test(password)) fortaleza += 1;
    if (/\d/.test(password)) fortaleza += 1;
    if (/[^a-zA-Z0-9]/.test(password)) fortaleza += 1;
    return fortaleza;
  };

  const fortalezaPassword = calcularFortalezaPassword(formData.password);
  const nivelesFortaleza = ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h2>
        <p className="text-gray-600 mt-2">
          {usuario 
            ? 'Actualiza la información del usuario seleccionado'
            : 'Completa el formulario para registrar un nuevo usuario en el sistema'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre de usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-500" />
                Nombre de usuario *
              </div>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={!!usuario} // No se puede cambiar username en edición
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${errors.username ? 'border-red-300' : 'border-gray-300'} ${usuario ? 'bg-gray-50' : ''}`}
              placeholder="juanperez"
            />
            {touched.username && errors.username ? (
              <div className="mt-2 flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.username}
              </div>
            ) : touched.username && !errors.username ? (
              <div className="mt-2 flex items-center text-green-600 text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                Nombre de usuario válido
              </div>
            ) : null}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-gray-500" />
                Email *
              </div>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="usuario@ejemplo.com"
            />
            {touched.email && errors.email ? (
              <div className="mt-2 flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.email}
              </div>
            ) : touched.email && !errors.email ? (
              <div className="mt-2 flex items-center text-green-600 text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                Email válido
              </div>
            ) : null}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${errors.first_name ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Juan"
            />
            {touched.first_name && errors.first_name && (
              <div className="mt-2 flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.first_name}
              </div>
            )}
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apellido *
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${errors.last_name ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Pérez"
            />
            {touched.last_name && errors.last_name && (
              <div className="mt-2 flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.last_name}
              </div>
            )}
          </div>

          {/* Contraseña (solo en creación o cambio) */}
          {!usuario && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center">
                    <Lock className="w-4 h-4 mr-2 text-gray-500" />
                    Contraseña *
                  </div>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${errors.password ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="••••••••"
                />
                
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700">Fortaleza:</span>
                      <span className={`text-sm font-medium ${fortalezaPassword >= 4 ? 'text-green-600' : fortalezaPassword >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {nivelesFortaleza[fortalezaPassword - 1] || 'Muy débil'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${fortalezaPassword >= 4 ? 'bg-green-500' : fortalezaPassword >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${(fortalezaPassword / 5) * 100}%` }}
                      />
                    </div>
                    <ul className="mt-2 text-xs text-gray-600 space-y-1">
                      <li className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : ''}`}>
                        {formData.password.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
                      </li>
                      <li className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                        {/[a-z]/.test(formData.password) ? '✓' : '○'} Letra minúscula
                      </li>
                      <li className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                        {/[A-Z]/.test(formData.password) ? '✓' : '○'} Letra mayúscula
                      </li>
                      <li className={`flex items-center ${/\d/.test(formData.password) ? 'text-green-600' : ''}`}>
                        {/\d/.test(formData.password) ? '✓' : '○'} Número
                      </li>
                    </ul>
                  </div>
                )}
                
                {touched.password && errors.password && (
                  <div className="mt-2 flex items-center text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar contraseña *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="••••••••"
                />
                {touched.confirmPassword && errors.confirmPassword ? (
                  <div className="mt-2 flex items-center text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.confirmPassword}
                  </div>
                ) : touched.confirmPassword && !errors.confirmPassword ? (
                  <div className="mt-2 flex items-center text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Contraseñas coinciden
                  </div>
                ) : null}
              </div>
            </>
          )}

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-500" />
                Teléfono
              </div>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${errors.phone ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="+57 300 123 4567"
            />
            {touched.phone && errors.phone && (
              <div className="mt-2 flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.phone}
              </div>
            )}
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2 text-gray-500" />
                Rol *
              </div>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: 'EMPLEADO' }))}
                className={`p-4 border rounded-xl text-center transition ${formData.role === 'EMPLEADO' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-gray-400'}`}
              >
                <div className="font-medium">Empleado</div>
                <div className="text-sm text-gray-600 mt-1">Acceso limitado</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: 'ADMIN' }))}
                className={`p-4 border rounded-xl text-center transition ${formData.role === 'ADMIN' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-300 hover:border-gray-400'}`}
              >
                <div className="font-medium">Administrador</div>
                <div className="text-sm text-gray-600 mt-1">Acceso completo</div>
              </button>
            </div>
            <input type="hidden" name="role" value={formData.role} />
          </div>
        </div>

        {/* Notas */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Información importante</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Los campos marcados con * son obligatorios</li>
                  <li>El nombre de usuario no se puede cambiar después de creado</li>
                  <li>Los administradores tienen acceso completo al sistema</li>
                  <li>Los empleados solo pueden acceder a funcionalidades básicas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
            disabled={isLoading}
          >
            Cancelar
          </button>
          
          <div className="flex items-center space-x-4">
            {isLoading && (
              <div className="flex items-center text-gray-600">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Procesando...
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {usuario ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UsuarioForm;