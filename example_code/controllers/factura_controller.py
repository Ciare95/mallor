from flask import Blueprint, request, jsonify, render_template
from app.models.facturas import FacturaModel

factura_bp = Blueprint('facturas', __name__)

@factura_bp.route('/registro_ingresos/crear_factura', methods=['POST'])
def crear_factura():
    try:
        data = request.json
        id_proveedor = data['id_proveedor']
        total = data['total']
        numero_factura = data['numero_factura']

        factura_id = FacturaModel.crear_factura(id_proveedor, numero_factura, total)
        return jsonify({'message': 'Factura creada exitosamente', 'id': factura_id}), 201
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Error al crear la factura'}), 500


@factura_bp.route('/mis_facturas')
def mis_facturas():
    try:
        facturas = FacturaModel.obtener_todas_las_facturas()
        
        return render_template('ventas/mis_facturas.html', facturas=facturas)
    except Exception as e:
        print(f"Error: {e}")
        return render_template('ventas/mis_facturas.html', facturas=[], error="Error al cargar facturas")
    

@factura_bp.route('/productos/<string:numero_factura>')
def obtener_productos_factura(numero_factura):
    try:
        productos = FacturaModel.obtener_productos_factura(numero_factura)
        return jsonify(productos)
    except Exception as e:
        return jsonify({'error': str(e)}), 500