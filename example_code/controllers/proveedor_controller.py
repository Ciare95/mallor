from flask import Blueprint, request, jsonify, render_template, flash, redirect, url_for
from app.models.proveedor import ProveedorModel

proveedor_bp = Blueprint('proveedor', __name__)

# JSON API route
@proveedor_bp.route('/api', methods=['GET'])
def obtener_proveedores():
    try:
        proveedores = ProveedorModel.obtener_proveedores()
        return jsonify(proveedores), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Error al obtener los proveedores'}), 500
    

@proveedor_bp.route('/listar', methods=['GET'])
def listar_proveedores():
    try:
        proveedores = ProveedorModel.obtener_proveedores()
        return render_template('proveedores/listar.html', proveedores=proveedores)
    except Exception as e:
        print(f"Error: {e}")
        flash("Error al obtener los proveedores. Inténtalo nuevamente.", "danger")
        return render_template('proveedores/listar.html', proveedores=[])


@proveedor_bp.route('/crear', methods=['POST'])
def crear_proveedor():
    try:
        data = request.json  # Recibe en formato json
        nombre = data.get('nombre')
        nit = data.get('nit')
        telefono = data.get('telefono')
        
        # Validación básica
        if not nombre:
            return jsonify({"success": False, "message": "El campo 'Nombre' es obligatorio."}), 400
            
        if ProveedorModel.crear_proveedor(nombre, nit, telefono):
            return jsonify({"success": True, "message": "Proveedor creado exitosamente."}), 201
        else:
            return jsonify({"success": False, "message": "Error al crear el proveedor."}), 500
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "message": "Error al crear el proveedor. Inténtalo nuevamente."}), 500


@proveedor_bp.route('/actualizar/<int:id>', methods=['POST'])
def actualizar_proveedor(id):
    try:
        data = request.json  # Recibe en formato JSON
        nombre = data.get('nombre')
        nit = data.get('nit')
        telefono = data.get('telefono')

        if not nombre:  # Validación en el backend
            return jsonify({"success": False, "message": "El campo 'Nombre' es obligatorio."}), 400

        if ProveedorModel.actualizar_proveedor(id, nombre, nit, telefono):
            return jsonify({"success": True, "message": "Proveedor actualizado exitosamente."}), 200
        else:
            return jsonify({"success": False, "message": "Error al actualizar el proveedor."}), 500
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "message": "Error al actualizar el proveedor. Inténtalo nuevamente."}), 500


@proveedor_bp.route('/eliminar/<int:id>', methods=['POST'])
def eliminar_proveedor(id):
    try:
        resultado, mensaje = ProveedorModel.eliminar_proveedor(id)
        if resultado:
            return jsonify({"success": True, "message": "Proveedor eliminado exitosamente."}), 200
        else:
            return jsonify({"success": False, "message": mensaje}), 400
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "message": "Error al eliminar el proveedor. Inténtalo nuevamente."}), 500
