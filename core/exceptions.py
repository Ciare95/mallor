from django.utils.translation import gettext_lazy as _


class MallorError(Exception):
    """
    Excepción base para todos los errores de dominio en el sistema Mallor.

    Attributes:
        message (str): Mensaje descriptivo del error
        code (str): Código único del error para identificación
    """

    def __init__(self, message: str, code: str = "error_general"):
        self.message = message
        self.code = code
        super().__init__(message)


class UsuarioError(MallorError):
    """
    Excepción base para errores de dominio en el módulo de usuarios.

    Attributes:
        message (str): Mensaje descriptivo del error
        code (str): Código único del error para identificación
    """

    def __init__(self, message: str, code: str = "usuario_error"):
        super().__init__(message, code)


class UsuarioNoEncontradoError(UsuarioError):
    """Excepción cuando un usuario no existe."""

    def __init__(self, user_id: int):
        super().__init__(
            message=_("Usuario con ID %(id)s no encontrado.") % {'id': user_id},
            code="usuario_no_encontrado"
        )


class UsuarioDuplicadoError(UsuarioError):
    """Excepción cuando se intenta crear un usuario con datos duplicados."""

    def __init__(self, campo: str, valor: str):
        super().__init__(
            message=_("%(campo)s '%(valor)s' ya está en uso.") % {
                'campo': campo,
                'valor': valor
            },
            code="usuario_duplicado"
        )


class PasswordIncorrectoError(UsuarioError):
    """Excepción cuando la contraseña actual es incorrecta."""

    def __init__(self):
        super().__init__(
            message=_("La contraseña actual es incorrecta."),
            code="password_incorrecto"
        )


class PasswordInseguroError(UsuarioError):
    """Excepción cuando la contraseña no cumple requisitos de seguridad."""

    def __init__(self, motivo: str):
        super().__init__(
            message=_("La contraseña no es segura: %(motivo)s") % {'motivo': motivo},
            code="password_inseguro"
        )


class PermisoDenegadoError(UsuarioError):
    """Excepción cuando el usuario no tiene permisos para realizar una acción."""

    def __init__(self, accion: str):
        super().__init__(
            message=_("No tiene permisos para %(accion)s.") % {'accion': accion},
            code="permiso_denegado"
        )


class UltimoAdministradorError(UsuarioError):
    """Excepción cuando se intenta eliminar el último administrador."""

    def __init__(self):
        super().__init__(
            message=_("No se puede eliminar el último administrador del sistema."),
            code="ultimo_administrador"
        )


class InventarioError(MallorError):
    """
    Excepción base para errores de dominio en el módulo de inventario.

    Attributes:
        message (str): Mensaje descriptivo del error
        code (str): Código único del error para identificación
    """

    def __init__(self, message: str, code: str = "inventario_error"):
        super().__init__(message, code)


class ProductoNoEncontradoError(InventarioError):
    """Excepción cuando un producto no existe."""

    def __init__(self, producto_id: int):
        super().__init__(
            message=_("Producto con ID %(id)s no encontrado.") % {'id': producto_id},
            code="producto_no_encontrado"
        )


class ProductoDuplicadoError(InventarioError):
    """Excepción cuando se intenta crear un producto con código duplicado."""

    def __init__(self, campo: str, valor):
        super().__init__(
            message=_("%(campo)s '%(valor)s' ya está en uso.") % {
                'campo': campo,
                'valor': valor
            },
            code="producto_duplicado"
        )


class ProductoConMovimientosError(InventarioError):
    """Excepción cuando se intenta eliminar un producto que tiene movimientos."""

    def __init__(self, producto_id: int):
        super().__init__(
            message=_("No se puede eliminar el producto con ID %(id)s porque tiene movimientos registrados.") % {'id': producto_id},
            code="producto_con_movimientos"
        )


class StockInsuficienteError(InventarioError):
    """Excepción cuando no hay suficiente stock para realizar una operación."""

    def __init__(self, producto_nombre: str, disponible, requerido):
        super().__init__(
            message=_("Stock insuficiente para '%(producto)s'. Disponible: %(disponible)s, Requerido: %(requerido)s.") % {
                'producto': producto_nombre,
                'disponible': disponible,
                'requerido': requerido
            },
            code="stock_insuficiente"
        )


class FacturaNoEncontradaError(InventarioError):
    """Excepción cuando una factura de compra no existe."""

    def __init__(self, factura_id: int):
        super().__init__(
            message=_("Factura de compra con ID %(id)s no encontrada.") % {'id': factura_id},
            code="factura_no_encontrada"
        )


class FacturaYaProcesadaError(InventarioError):
    """Excepción cuando se intenta procesar una factura ya procesada."""

    def __init__(self, factura_id: int):
        super().__init__(
            message=_("La factura de compra con ID %(id)s ya fue procesada.") % {'id': factura_id},
            code="factura_ya_procesada"
        )


class FacturaSinDetallesError(InventarioError):
    """Excepción cuando se intenta procesar una factura sin detalles."""

    def __init__(self, factura_id: int):
        super().__init__(
            message=_("La factura de compra con ID %(id)s no tiene detalles asociados.") % {'id': factura_id},
            code="factura_sin_detalles"
        )


class CategoriaNoEncontradaError(InventarioError):
    """Excepción cuando una categoría no existe."""

    def __init__(self, categoria_id: int):
        super().__init__(
            message=_("Categoría con ID %(id)s no encontrada.") % {'id': categoria_id},
            code="categoria_no_encontrada"
        )


class CategoriaConProductosError(InventarioError):
    """Excepción cuando se intenta eliminar una categoría que tiene productos."""

    def __init__(self, categoria_nombre: str):
        super().__init__(
            message=_("No se puede eliminar la categoría '%(nombre)s' porque tiene productos asociados.") % {'nombre': categoria_nombre},
            code="categoria_con_productos"
        )


class VentaError(MallorError):
    """
    Excepción base para errores de dominio en el módulo de ventas.
    """

    def __init__(self, message: str, code: str = "venta_error"):
        super().__init__(message, code)


class VentaNoEncontradaError(VentaError):
    """Excepción cuando una venta no existe."""

    def __init__(self, venta_id: int):
        super().__init__(
            message=_("Venta con ID %(id)s no encontrada.") % {'id': venta_id},
            code="venta_no_encontrada",
        )


class VentaSinDetallesError(VentaError):
    """Excepción cuando una venta no contiene productos."""

    def __init__(self):
        super().__init__(
            message=_("La venta debe incluir al menos un producto."),
            code="venta_sin_detalles",
        )


class VentaNoEditableError(VentaError):
    """Excepción cuando una venta no puede modificarse."""

    def __init__(self, numero_venta: str, motivo: str):
        super().__init__(
            message=_(
                "La venta %(numero)s no se puede modificar: %(motivo)s."
            ) % {
                'numero': numero_venta,
                'motivo': motivo,
            },
            code="venta_no_editable",
        )


class VentaNoCancelableError(VentaError):
    """Excepción cuando una venta no puede cancelarse."""

    def __init__(self, numero_venta: str, motivo: str):
        super().__init__(
            message=_(
                "La venta %(numero)s no se puede cancelar: %(motivo)s."
            ) % {
                'numero': numero_venta,
                'motivo': motivo,
            },
            code="venta_no_cancelable",
        )


class VentaFacturadaError(VentaError):
    """Excepción cuando se intenta alterar una venta facturada."""

    def __init__(self, numero_venta: str):
        super().__init__(
            message=_(
                "La venta %(numero)s ya fue facturada y no admite cambios."
            ) % {
                'numero': numero_venta,
            },
            code="venta_facturada",
        )


class EstadoVentaInvalidoError(VentaError):
    """Excepción cuando se intenta usar un estado de venta inválido."""

    def __init__(self, estado: str):
        super().__init__(
            message=_("El estado de venta '%(estado)s' no es válido.") % {
                'estado': estado,
            },
            code="estado_venta_invalido",
        )


class AbonoNoPermitidoError(VentaError):
    """Excepción cuando un abono no cumple las reglas de negocio."""

    def __init__(self, motivo: str):
        super().__init__(
            message=_("No se puede registrar el abono: %(motivo)s.") % {
                'motivo': motivo,
            },
            code="abono_no_permitido",
        )


class AbonoNoEncontradoError(VentaError):
    """Excepción cuando un abono no existe."""

    def __init__(self, abono_id: int):
        super().__init__(
            message=_("Abono con ID %(id)s no encontrado.") % {
                'id': abono_id,
            },
            code="abono_no_encontrado",
        )
