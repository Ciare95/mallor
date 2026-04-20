from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from app.db import connection_pool as db

fabricante_utilidades_bp = Blueprint('fabricante_utilidades', __name__)


# Diccionario de conversiones
CONVERSIONES = {
    'gramos': {'kilos': 0.001, 'litros': 0.001, 'mililitros': 1, 'cc': 1, 'galon': 0.000264172, 'garrafa': 0.00005},
    'kilos': {'gramos': 1000, 'litros': 1, 'mililitros': 1000, 'cc': 1000, 'galon': 0.264172, 'garrafa': 0.05},
    'litros': {'gramos': 1000, 'kilos': 1, 'mililitros': 1000, 'cc': 1000, 'galon': 0.264172, 'garrafa': 0.05},
    'mililitros': {'gramos': 1, 'kilos': 0.001, 'litros': 0.001, 'cc': 1, 'galon': 0.000264172, 'garrafa': 0.00005},
    'cc': {'gramos': 1, 'kilos': 0.001, 'litros': 0.001, 'mililitros': 1, 'galon': 0.000264172, 'garrafa': 0.00005},
    'galon': {'gramos': 3785.41, 'kilos': 3.78541, 'litros': 3.78541, 'mililitros': 3785.41, 'cc': 3785.41, 'garrafa': 0.18927},
    'garrafa': {'gramos': 20000, 'kilos': 20, 'litros': 20, 'mililitros': 20000, 'cc': 20000, 'galon': 5.28344}
}


def convertir_unidad(cantidad, unidad_origen, unidad_destino):
    """Convierte una cantidad de una unidad a otra."""
    if unidad_origen == unidad_destino:
        return cantidad
    conversion = CONVERSIONES.get(unidad_origen, {}).get(unidad_destino)
    if conversion is None:
        raise ValueError(f"No hay una conversión definida entre {unidad_origen} y {unidad_destino}")
    return cantidad * conversion


@fabricante_utilidades_bp.route('/fabricante/actualizar_costo_total', methods=['POST'])
def actualizar_costo_total():
    try:
        data = request.get_json()
        ingredientes = data.get('ingredientes', [])
        producto_id = data.get('productoId')
        
        if not producto_id:
            return jsonify({"success": False, "error": "Product ID is required"}), 400
            
        total_costo = 0
        for ingrediente in ingredientes:
            cantidad = ingrediente['cantidadNecesaria']
            costo_unitario = ingrediente['costoUnitario']
            total_costo += float(cantidad) * float(costo_unitario)

        conn = db.getconn()
        cursor = conn.cursor()

        update_query = """
            UPDATE productos_fabricados
            SET costo_total = %s
            WHERE id = %s
        """
        cursor.execute(update_query, (total_costo, producto_id))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"success": True})

    except Exception as e:
        print(f"Error al actualizar el costo total: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@fabricante_utilidades_bp.route('/buscar_ingrediente', methods=['GET'])
def buscar_ingrediente():
    # Obtener el término de búsqueda desde la solicitud
    termino = request.args.get('q', '').strip()
    
    if not termino:
        return jsonify([])  # Devuelve una lista vacía si no hay término
    
    # Consulta de ingredientes filtrados por el término
    query = "SELECT * FROM ingredientes WHERE nombre LIKE %s LIMIT 10"
    connection = db.getconn()
    with connection.cursor(dictionary=True) as cursor:
        cursor.execute(query, (f"%{termino}%",))
        resultados = cursor.fetchall()
    connection.close()
    
    # Retornar los resultados como JSON
    return jsonify(resultados)
