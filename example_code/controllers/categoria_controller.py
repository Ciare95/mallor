from flask import render_template, request, redirect, url_for, Blueprint, flash
from app.models.categorias import Categoria
from app.models.productos import Producto
from flask_login import login_required
from app.controllers.usuario_controller import administrador_requerido

categoria_bp = Blueprint("categoria", __name__, url_prefix="/categorias")


@categoria_bp.route('/', methods=['GET'])
def listar_categorias():
    categoria = Categoria()
    categorias = categoria.obtener_categorias()
    return render_template('categorias/listar.html', categorias=categorias)


@categoria_bp.route('/crear', methods=['GET', 'POST'])
@login_required
@administrador_requerido  # Solo los administradores pueden acceder a esta ruta
def crear_categoria():
    if request.method == 'POST':
        nombre = request.form['nombre']
        categoria = Categoria(nombre=nombre)
        if categoria.crear_categoria():
            flash("Categoría creada correctamente.", "success")
        else:
            flash("Error al crear la categoría. Inténtalo de nuevo.", "danger")
        return redirect(url_for('categoria.listar_categorias'))
    return render_template('categorias/listar.html')


@categoria_bp.route('/editar/<int:id>', methods=['GET', 'POST'])
@login_required
@administrador_requerido  # Solo los administradores pueden acceder a esta ruta
def editar_categoria(id):
    categoria = Categoria()
    categoria.obtener_por_id(id)
    if request.method == 'POST':
        categoria.nombre = request.form['nombre']
        if categoria.editar_categoria():
            flash("Categoría actualizada correctamente.", "success")
        else:
            flash("Error al actualizar la categoría. Inténtalo de nuevo.", "danger")
        return redirect(url_for('categoria.listar_categorias'))
    return render_template('categorias/listar.html', categoria=categoria)


@categoria_bp.route('/eliminar/<int:id>', methods=['POST'])
@login_required
@administrador_requerido  # Solo los administradores pueden acceder a esta ruta
def eliminar_categoria(id):
    categoria = Categoria(id=id)
    if categoria.eliminar_categoria():
        flash("Categoría eliminada correctamente.", "success")
    else:
        flash("No se pudo eliminar la categoría. Puede estar asociada a productos existentes.", "danger")
    return redirect(url_for('categoria.listar_categorias'))


@categoria_bp.route('/<int:id>/productos', methods=['GET'])
def ver_productos_categoria(id):
    categoria = Categoria()
    categoria.obtener_por_id(id)
    producto = Producto()
    productos = producto.obtener_por_categoria(id)
    categorias = Categoria().obtener_categorias()
    
    if not productos:
        flash(f"No se encontraron productos en la categoría '{categoria.nombre}'.", "info")
    return render_template('categorias/ver_productos.html', categoria=categoria, productos=productos, categorias=categorias)
