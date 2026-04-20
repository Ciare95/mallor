from flask import render_template, request, redirect, url_for, Blueprint, jsonify, flash
from app.models.clientes import Cliente
from flask_login import login_required
from app.controllers.usuario_controller import administrador_requerido

cliente_bp = Blueprint("cliente", __name__, url_prefix="/clientes")

@cliente_bp.route('/', methods=['GET'])
def listar_clientes():
    cliente = Cliente()
    clientes = cliente.obtener_clientes()

    # Encontrar al cliente "Default User" y colocarlo al inicio
    cliente_predeterminado = None
    for c in clientes:
        if c.nombre == "Default User":
            cliente_predeterminado = c
            break

    if cliente_predeterminado:
        # Eliminar "Default User" de la lista (por si se encuentra en otra posición)
        clientes.remove(cliente_predeterminado)
        # Insertarlo al principio de la lista
        clientes.insert(0, cliente_predeterminado)

    return render_template('clientes/listar.html', clientes=clientes)


@cliente_bp.route('/crear', methods=['GET', 'POST'])
@login_required
def crear_cliente():
    if request.method == 'POST':
        nombre = request.form['nombre']
        apellido = request.form['apellido']
        documento = request.form['documento']
        cliente = Cliente(nombre=nombre, apellido=apellido, documento=documento)
        if cliente.crear_cliente():
            flash("Cliente creado exitosamente.", "success")
            return redirect(url_for('cliente.listar_clientes'))
    return render_template('clientes/listar.html')

@cliente_bp.route('/editar/<int:id>', methods=['GET', 'POST'])
@login_required
@administrador_requerido
def editar_cliente(id):
    cliente = Cliente()
    cliente.obtener_por_id(id)
    if not cliente:
        flash("Cliente no encontrado.", "danger")
        return redirect(url_for('cliente.listar_clientes'))

    if request.method == 'POST':
        cliente.nombre = request.form['nombre']
        cliente.apellido = request.form['apellido']
        cliente.documento = request.form['documento']

        if not cliente.nombre or not cliente.apellido or not cliente.documento:
            flash("Todos los campos son obligatorios.", "danger")
            return redirect(url_for('cliente.editar_cliente', id=id))

        if cliente.editar_cliente():
            flash("Cliente actualizado con éxito.", "success")
            return redirect(url_for('cliente.listar_clientes'))

        flash("Ocurrió un error al actualizar el cliente.", "danger")
        return redirect(url_for('cliente.editar_cliente', id=id))

    return render_template('clientes/listar.html', cliente=cliente)


@cliente_bp.route('/eliminar/<int:id>', methods=['POST'])
@login_required
@administrador_requerido
def eliminar_cliente(id):
    cliente = Cliente(id=id)
    if cliente.eliminar_cliente():
        flash('Cliente eliminado exitosamente', 'success')
        return redirect(url_for('cliente.listar_clientes'))
    flash('No se pudo eliminar el cliente', 'danger')
    return redirect(url_for('cliente.listar_clientes'))


@cliente_bp.route('/api/lista', methods=['GET'])
def lista_clientes_api():
    cliente = Cliente()
    clientes = cliente.obtener_clientes()
    return jsonify([{'id': c.id, 'nombre': f"{c.nombre} {c.apellido}"} for c in clientes])


