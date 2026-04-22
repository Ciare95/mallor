import { useState } from 'react';
import { Lock, Eye, EyeOff, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cambiarPassword } from '../../services/usuarios.service';

const PasswordInput = ({ name, label, show, onToggle, placeholder, value, onChange, error }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
    {error && (
      <p className="mt-1.5 flex items-center text-xs text-red-600">
        <AlertCircle className="w-3.5 h-3.5 mr-1" />
        {error}
      </p>
    )}
  </div>
);

/**
 * Modal para cambiar la contraseña de un usuario.
 *
 * @param {Object} props
 * @param {Object} props.usuario - Usuario al que se le cambiará la contraseña
 * @param {Function} props.onSuccess - Callback al cambiar la contraseña con éxito
 * @param {Function} props.onCancel - Callback al cancelar
 * @returns {JSX.Element}
 */
const CambiarPasswordModal = ({ usuario, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const calcularFortaleza = (password) => {
    if (!password) return 0;
    let f = 0;
    if (password.length >= 8) f++;
    if (/[a-z]/.test(password)) f++;
    if (/[A-Z]/.test(password)) f++;
    if (/\d/.test(password)) f++;
    if (/[^a-zA-Z0-9]/.test(password)) f++;
    return f;
  };

  const fortaleza = calcularFortaleza(formData.newPassword);
  const coloresFortaleza = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  const etiquetasFortaleza = ['', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];

  const validate = () => {
    const newErrors = {};
    if (!formData.oldPassword) newErrors.oldPassword = 'La contraseña actual es requerida';
    if (!formData.newPassword) newErrors.newPassword = 'La nueva contraseña es requerida';
    else if (formData.newPassword.length < 8) newErrors.newPassword = 'Mínimo 8 caracteres';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword))
      newErrors.newPassword = 'Debe contener mayúsculas, minúsculas y números';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirma la nueva contraseña';
    else if (formData.confirmPassword !== formData.newPassword)
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (apiError) setApiError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setApiError(null);
    try {
      await cambiarPassword(usuario.id, formData.oldPassword, formData.newPassword);
      onSuccess();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.old_password?.[0] ||
        err?.response?.data?.new_password?.[0] ||
        'Error al cambiar la contraseña';
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && !isLoading && onCancel()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Cambiar contraseña</h2>
              <p className="text-xs text-gray-500">@{usuario?.username}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-t border-gray-100" />

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-red-800">{apiError}</span>
            </div>
          )}

          <PasswordInput
            name="oldPassword"
            label="Contraseña actual *"
            show={showOld}
            onToggle={() => setShowOld((v) => !v)}
            placeholder="Tu contraseña actual"
            value={formData.oldPassword}
            onChange={handleChange}
            error={errors.oldPassword}
          />

          <PasswordInput
            name="newPassword"
            label="Nueva contraseña *"
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            placeholder="Nueva contraseña"
            value={formData.newPassword}
            onChange={handleChange}
            error={errors.newPassword}
          />

          {/* Indicador de fortaleza */}
          {formData.newPassword && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Fortaleza</span>
                <span className={`font-medium ${fortaleza >= 4 ? 'text-green-600' : fortaleza >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {etiquetasFortaleza[fortaleza]}
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${coloresFortaleza[fortaleza]}`}
                  style={{ width: `${(fortaleza / 5) * 100}%` }}
                />
              </div>
            </div>
          )}

          <PasswordInput
            name="confirmPassword"
            label="Confirmar nueva contraseña *"
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            placeholder="Repite la nueva contraseña"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />

          {formData.confirmPassword && formData.confirmPassword === formData.newPassword && !errors.confirmPassword && (
            <p className="flex items-center text-xs text-green-600">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Las contraseñas coinciden
            </p>
          )}
        </form>

        <div className="border-t border-gray-100" />

        <div className="px-6 py-4 flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-5 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow text-sm disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cambiando...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Cambiar contraseña
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CambiarPasswordModal;
