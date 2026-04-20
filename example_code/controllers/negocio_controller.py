from flask import Blueprint, render_template, request, redirect, url_for, jsonify, flash
from app.models.negocios import Negocio
from app.db import connection_pool

negocio_bp = Blueprint('negocio', __name__)

@negocio_bp.route('/listar')
def listar():
    try:
        conexion = connection_pool.getconn()
        negocios = Negocio.obtener_todos(conexion)
        return render_template('negocios/listar.html', negocios=negocios)
    except Exception as e:
        flash("Error al obtener la lista de negocios. Inténtalo nuevamente.", "danger")
        return redirect(url_for('negocio.listar')), 500
    finally:
        if 'conexion' in locals() and conexion.closed == 0:
            connection_pool.putconn(conexion)


@negocio_bp.route('/crear', methods=['POST'])
def crear():
    try:
        conexion = connection_pool.getconn()
        datos = request.get_json()  # Cambiar to get_json() if you're sending JSON
        nuevo_negocio = Negocio(
            nombre=datos['nombre'],
            nit=datos['nit'],
            direccion=datos['direccion'],
            telefono=datos['telefono'],
            email=datos['email']
        )
        Negocio.crear(conexion, nuevo_negocio)
        flash("Negocio creado exitosamente.", "success")
        return jsonify({"success": True, "message": "Negocio creado exitosamente"})
    except Exception as e:
        flash(f"Error al crear el negocio: {str(e)}", "danger")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'conexion' in locals() and conexion.closed == 0:
            connection_pool.putconn(conexion)


@negocio_bp.route('/actualizar/<int:id>', methods=['PUT'])
def actualizar(id):
    try:
        conexion = connection_pool.getconn()
        datos = request.json
        negocio = Negocio(
            id=id,
            nombre=datos['nombre'],
            nit=datos['nit'],
            direccion=datos['direccion'],
            telefono=datos['telefono'],
            email=datos['email']
        )
        Negocio.actualizar(conexion, negocio)
        flash("Negocio actualizado exitosamente.", "success")
        return jsonify({"success": True, "message": "Negocio actualizado exitosamente"})
    except Exception as e:
        flash(f"Error al actualizar el negocio: {str(e)}", "danger")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'conexion' in locals() and conexion.closed == 0:
            connection_pool.putconn(conexion)


@negocio_bp.route('/eliminar/<int:id>', methods=['DELETE'])
def eliminar(id):
    try:
        conexion = connection_pool.getconn()
        Negocio.eliminar(conexion, id)
        flash("Negocio eliminado exitosamente.", "success")
        return jsonify({"success": True, "message": "Negocio eliminado exitosamente"})
    except Exception as e:
        flash(f"Error al eliminar el negocio: {str(e)}", "danger")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'conexion' in locals() and conexion.closed == 0:
            connection_pool.putconn(conexion)
