from flask import render_template, request, redirect, url_for, flash, Blueprint
from flask_login import login_user, logout_user, login_required, current_user
from app.models.usuarios import Usuario
from flask import abort
from flask_login import current_user
from functools import wraps


# Crear Blueprint para usuarios
usuario_bp = Blueprint("usuario", __name__, url_prefix="/usuarios")

# Decorador para permitir acceso solo a administradores
def administrador_requerido(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if current_user.id_rol != 1:  # Solo los administradores (rol id 1) tienen acceso
            abort(403)  # Error 403: Prohibido
        return func(*args, **kwargs)
    return wrapper


@usuario_bp.route('/', methods=['GET'])
@login_required
def listar_usuarios():
    usuario = Usuario()
    usuarios = usuario.obtener_usuarios()
    return render_template('usuarios/listar.html', usuarios=usuarios)


@usuario_bp.route('/crear', methods=['GET', 'POST'])
@login_required
def crear_usuario():
    if request.method == 'POST':
        nombre = request.form['nombre']
        contrasena = request.form['password']
        id_rol = request.form['rol']
        usuario = Usuario(nombre=nombre, contrasena=contrasena, id_rol=id_rol)
        if usuario.crear_usuario():
            flash('Usuario creado exitosamente', 'success')
            return redirect(url_for('usuario.listar_usuarios'))
        flash('Error al crear el usuario', 'danger')
    return render_template('usuarios/listar.html')


@usuario_bp.route('/editar/<int:id>', methods=['GET', 'POST'])
@login_required
def editar_usuario(id):
    usuario = Usuario()
    usuario.obtener_por_id(id)
    if request.method == 'POST':
        usuario.nombre = request.form['nombre']
        usuario.password = request.form['password']
        usuario.id_rol = request.form['rol']
        if usuario.actualizar_usuario():
            flash('Usuario actualizado exitosamente', 'success')
            return redirect(url_for('usuario.listar_usuarios'))
        flash('Error al actualizar el usuario', 'danger')
    return render_template('usuarios/listar.html', usuario=usuario)


@usuario_bp.route('/eliminar/<int:id>', methods=['POST'])
@login_required
def eliminar_usuario(id):
    usuario = Usuario(id=id)
    if usuario.eliminar_usuario():
        flash('Usuario eliminado exitosamente', 'success')
        return redirect(url_for('usuario.listar_usuarios'))
    flash('Error al eliminar el usuario', 'danger')
    return render_template('usuarios/error.html', mensaje="No se pudo eliminar el usuario.")


# Login y logout
@usuario_bp.route('/login', methods=['GET', 'POST'])
def login():
    # Si el usuario ya está autenticado, redirige al index
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        nombre = request.form['nombre']
        contrasena = request.form['password']
        usuario = Usuario.obtener_por_nombre(nombre)

        if usuario and usuario.contrasena == contrasena:
            usuario._authenticated = True 
            login_user(usuario)  # Usar login_user para autenticar al usuario
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            return redirect(url_for('index'))
        else:
            flash('Usuario o contraseña incorrectos', 'danger')

    return render_template('usuarios/login.html')


@usuario_bp.route('/logout')
@login_required
def logout():
    current_user._authenticated = False  # Marcamos al usuario como no autenticado
    logout_user()
    flash('Has cerrado sesión', 'info')
    return redirect(url_for('usuario.login'))

