from flask import Blueprint, request, jsonify, render_template, flash, make_response
from flask_login import current_user, login_required
from datetime import datetime
from app.models.abonos import AbonoModel
import pdfkit
from app.db import connection_pool

venta_bp = Blueprint('ventas', __name__)

def formato_peso_colombiano(valor):
    if valor is None:
        return "0"
    return f"{'{:,.0f}'.format(float(valor)).replace(',', '.')}"

def row_to_dict(cursor, row):
    """Convert a database row (tuple) to a dictionary using cursor description"""
    if row is None:
        return None
    return {desc[0]: value for desc, value in zip(cursor.description, row)}


from flask import current_app

@venta_bp.route('/crear', methods=['POST'])
@login_required
def crear_venta():
   current_app.logger.debug(f"Usuario autenticado: {current_user.is_authenticated}")
   if current_user.is_authenticated:
       current_app.logger.debug(f"ID de usuario: {current_user.id}")

   data = request.json
   current_app.logger.debug(f"Datos recibidos: {data}")
   productos = data.get('productos')
   total = data.get('total')
   id_cliente = data.get('id_cliente')
   estado = data.get('estado', 'pendiente')
   saldo = float(total) if estado != 'cancelada' else 0.0
   monto_abono = float(data.get('monto_abono', 0))

   # Asegurarse de que el usuario está autenticado
   if not current_user.is_authenticated:
       return jsonify({
           'error': 'Usuario no autenticado.',
           'message': 'Debe iniciar sesión para realizar esta acción.',
           'category': 'danger'
       }), 401

   id_usuario = current_user.id

   # Validar payload de productos antes de procesar
   if not isinstance(productos, list) or any((not isinstance(p, dict) or 'id' not in p or 'cantidad' not in p) for p in productos):
       return jsonify({'error': 'Formato de productos inválido.', 'message': 'Cada producto debe contener id y cantidad.', 'category': 'danger'}), 400

   if not productos:
       return jsonify({
           'error': 'No se enviaron productos.',
           'message': 'No se enviaron productos.',
           'category': 'danger'
       }), 400

   if not id_cliente:
       return jsonify({
           'error': 'El campo id_cliente es obligatorio.',
           'message': 'El campo id_cliente es obligatorio.',
           'category': 'danger'
       }), 400

   connection = connection_pool.getconn()
   cursor = connection.cursor()

   try:
       current_app.logger.debug("Ejecutando inserción en la tabla de ventas...")
       cursor.execute(
           """
           INSERT INTO ventas (fecha_venta, total_venta, id_cliente, id_usuarios, estado, saldo)
           VALUES (NOW(), %s, %s, %s, %s, %s)
           RETURNING id
           """,
           (total, id_cliente, id_usuario, estado, saldo)
       )
       id_venta = cursor.fetchone()[0]
       current_app.logger.debug(f"Venta creada con ID: {id_venta}")
       # La conexión se confirma al final si todo es exitoso.

       for producto in productos:
        id_producto = producto['id']
        cantidad = producto['cantidad']
        
        # Obtener información del producto
        cursor.execute("SELECT stock, es_servicio FROM productos WHERE id = %s", (id_producto,))
        resultado = cursor.fetchone()
        
        if not resultado:
            raise ValueError(f"El producto con id {id_producto} no existe.")
        
        stock_actual, es_servicio = resultado
        
        # Si no es un servicio, verificar y actualizar el stock
        if es_servicio == 0:  # 0 significa que no es un servicio (producto físico)
            if stock_actual is None or stock_actual < cantidad:
                raise ValueError(f"Stock insuficiente para el producto con id {id_producto}.")
            
            # Actualizar el stock solo si no es un servicio
            cursor.execute("UPDATE productos SET stock = stock - %s WHERE id = %s", (cantidad, id_producto))
        
        # Insertar el detalle de la venta (tanto para productos como servicios)
        cursor.execute(
            """
            INSERT INTO detalle_ventas (id_ventas, id_productos, cantidad)
            VALUES (%s, %s, %s)
            """,
            (id_venta, id_producto, cantidad)
        )

       if monto_abono > 0:
           AbonoModel.registrar_abono(id_venta, monto_abono)
           nuevo_saldo = saldo - monto_abono
           nuevo_estado = 'cancelada' if nuevo_saldo == 0 else 'pendiente'
           AbonoModel.actualizar_saldo(id_venta, nuevo_saldo, nuevo_estado)

       connection.commit()

       return jsonify({
           'success': True,
           'message': 'Venta creada exitosamente.',
           'category': 'success',
           'id_venta': id_venta
       }), 200

   except Exception as e:
       connection.rollback()
       current_app.logger.error(f"Error al crear la venta: {e}", exc_info=True)
       return jsonify({
           'error': str(e),
           'message': f"Error al crear la venta: {str(e)}",
           'category': 'danger'
       }), 500

   finally:
       cursor.close()
       connection_pool.putconn(connection)
       
       

@venta_bp.route('/', methods=['GET'])
def listar_ventas():
    return render_template('ventas/historial_general.html')


@venta_bp.route('/asociar-cliente', methods=['POST'])
def asociar_cliente():
    data = request.json
    id_venta = data.get('id_venta')
    id_cliente = data.get('id_cliente')

    if not id_venta or not id_cliente:
        flash("Datos incompletos. Se requieren id_venta y id_cliente.", "danger")
        return jsonify({'error': 'Datos incompletos.'}), 400

    # Verificar si el cliente existe
    conexion = connection_pool.getconn()
    cursor = conexion.cursor()
    cursor.execute("SELECT COUNT(*) FROM clientes WHERE id = %s", (id_cliente,))
    cliente_existe = cursor.fetchone()[0] > 0

    if not cliente_existe:
        flash("El cliente no existe.", "danger")
        return jsonify({'error': 'El cliente no existe.'}), 400

    try:
        sql = "UPDATE ventas SET id_cliente = %s WHERE id = %s"
        cursor.execute(sql, (id_cliente, id_venta))
        conexion.commit()
        flash("Cliente asociado con éxito.", "success")
        return jsonify({'message': 'Cliente asociado con éxito.'})
    except Exception as e:
        flash(f"Error al asociar el cliente: {str(e)}", "danger")
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conexion:
            connection_pool.putconn(conexion)

@venta_bp.route('/ver/<int:id_venta>', methods=['GET'])
def ver_venta(id_venta):
    conexion = None
    cursor = None
    try:
        current_app.logger.debug(f"Intentando obtener detalles de venta ID: {id_venta}")
        # Obtener los detalles de la venta
        conexion = connection_pool.getconn()
        cursor = conexion.cursor()
        current_app.logger.debug("Conexión y cursor creados exitosamente")

        # Información de la venta
        cursor.execute("""
            SELECT v.id AS id_venta, v.fecha_venta, v.total_venta, v.estado, v.saldo, c.nombre AS cliente, u.nombre AS usuario
            FROM ventas v
            LEFT JOIN clientes c ON v.id_cliente = c.id
            LEFT JOIN usuarios u ON v.id_usuarios = u.id
            WHERE v.id = %s
        """, (id_venta,))
        venta_tuple = cursor.fetchone()

        if not venta_tuple:
            flash("Venta no encontrada.", "danger")
            return "Venta no encontrada", 404

        # Convertir tupla a diccionario
        venta = row_to_dict(cursor, venta_tuple)

        # Formatear valores monetarios
        venta['total_venta'] = formato_peso_colombiano(venta['total_venta'])
        venta['saldo'] = formato_peso_colombiano(venta['saldo'])

        # Obtener detalles de los productos
        cursor.execute("""
            SELECT p.nombre AS producto, dv.cantidad, p.precio, (dv.cantidad * p.precio) AS subtotal
            FROM detalle_ventas dv
            JOIN productos p ON dv.id_productos = p.id
            WHERE dv.id_ventas = %s
        """, (id_venta,))
        detalles_tuples = cursor.fetchall()
        
        # Convertir tuplas a diccionarios
        detalles = []
        for detalle_tuple in detalles_tuples:
            detalle = row_to_dict(cursor, detalle_tuple)
            detalle['precio'] = formato_peso_colombiano(detalle['precio'])
            detalle['subtotal'] = formato_peso_colombiano(detalle['subtotal'])
            detalles.append(detalle)

        # Obtener los abonos realizados
        cursor.execute("""
            SELECT fecha_abono, monto
            FROM abonos
            WHERE id_venta = %s
        """, (id_venta,))
        abonos_tuples = cursor.fetchall()
        
        # Convertir tuplas a diccionarios
        abonos = []
        for abono_tuple in abonos_tuples:
            abono = row_to_dict(cursor, abono_tuple)
            abono['monto'] = formato_peso_colombiano(abono['monto'])
            abonos.append(abono)

        return render_template(
            'ventas/ver.html',
            venta=venta,
            detalles=detalles,
            abonos=abonos
        )
    except Exception as e:
        current_app.logger.error(f"Error al obtener detalles de la venta {id_venta}: {e}", exc_info=True)
        flash("Error al obtener detalles de la venta.", "danger")
        return "Error interno", 500
    finally:
        if cursor:
            cursor.close()
        if conexion:
            connection_pool.putconn(conexion)


            
                       
@venta_bp.route('/factura/<int:id_venta>/pdf', methods=['GET'])
def generar_factura_pdf(id_venta):
    conexion = None
    cursor = None
    try:
        conexion = connection_pool.getconn()
        cursor = conexion.cursor()

        # Obtener información del negocio
        cursor.execute("SELECT * FROM negocios LIMIT 1")
        negocio = cursor.fetchone()

        # Obtener información de la venta
        cursor.execute("""
            SELECT v.id AS id_venta, v.fecha_venta, v.total_venta, v.estado, v.saldo, 
                   c.nombre AS cliente, u.nombre AS usuario
            FROM ventas v
            LEFT JOIN clientes c ON v.id_cliente = c.id
            LEFT JOIN usuarios u ON v.id_usuarios = u.id
            WHERE v.id = %s
        """, (id_venta,))
        venta = cursor.fetchone()

        if not venta:
            return "Venta no encontrada", 404

        # Formatear valores monetarios
        venta['total_venta'] = formato_peso_colombiano(venta['total_venta'])
        venta['saldo'] = formato_peso_colombiano(venta['saldo'])

        # Obtener detalles de los productos
        cursor.execute("""
            SELECT p.nombre AS producto, dv.cantidad, p.precio, 
                   (dv.cantidad * p.precio) AS subtotal
            FROM detalle_ventas dv
            JOIN productos p ON dv.id_productos = p.id
            WHERE dv.id_ventas = %s
        """, (id_venta,))
        detalles = cursor.fetchall()

        for detalle in detalles:
            detalle['precio'] = formato_peso_colombiano(detalle['precio'])
            detalle['subtotal'] = formato_peso_colombiano(detalle['subtotal'])

        # Obtener abonos
        cursor.execute("""
            SELECT fecha_abono, monto
            FROM abonos
            WHERE id_venta = %s
        """, (id_venta,))
        abonos = cursor.fetchall()

        for abono in abonos:
            abono['monto'] = formato_peso_colombiano(abono['monto'])

        venta['detalles'] = detalles
        venta['abonos'] = abonos
        
        print("Detalles encontrados:", detalles)


        # Renderizar el template HTML incluyendo el negocio
        html = render_template(
            'ventas/factura.html',
            venta=venta,
            detalles=detalles,  # Pasarlo como variable separada
            abonos=abonos,
            negocio=negocio
        )

        # Configuración de pdfkit
        path_wkhtmltopdf = r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe'
        config = pdfkit.configuration(wkhtmltopdf=path_wkhtmltopdf)
        options = {
            'page-size': 'Letter',
            'encoding': 'UTF-8',
            'margin-top': '0.75in',
            'margin-right': '0.75in',
            'margin-bottom': '0.75in',
            'margin-left': '0.75in'
        }

        pdf = pdfkit.from_string(html, False, configuration=config, options=options)
        
        response = make_response(pdf)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=factura_{id_venta}.pdf'

        return response

    except Exception as e:
        print(f"Error al generar PDF: {e}")
        return "Error al generar PDF", 500
    finally:
        if cursor:
            cursor.close()
        if conexion:
            connection_pool.putconn(conexion)
        

@venta_bp.route('/ventas_categoria')
def ventas_categoria():
    connection = connection_pool.getconn()
    cursor = connection.cursor()
    
    # Get filter parameters or use current date as default
    fecha = request.args.get('fecha', datetime.now().strftime('%Y-%m-%d'))
    mes = request.args.get('mes')
    anio = request.args.get('anio')
    
    # Base query
    query = """
    SELECT 
        c.nombre as categoria, 
        COUNT(DISTINCT v.id) as total_ventas,
        SUM(p.precio * dv.cantidad) as monto_total
    FROM categorias c
    JOIN productos p ON c.id = p.id_categorias
    JOIN detalle_ventas dv ON p.id = dv.id_productos
    JOIN ventas v ON dv.id_ventas = v.id
    WHERE DATE(v.fecha_venta) = %s
    GROUP BY c.id, c.nombre
    """
    
    params = [fecha]
    
    # Modify query if mes or anio are specified
    if mes:
        query = query.replace("DATE(v.fecha_venta) = %s", "DATE_FORMAT(v.fecha_venta, '%Y-%m') = %s")
        params = [mes]
    elif anio:
        query = query.replace("DATE(v.fecha_venta) = %s", "YEAR(v.fecha_venta) = %s")
        params = [anio]
    
    cursor.execute(query, params)
    ventas_categoria = cursor.fetchall()
    
    cursor.close()
    connection_pool.putconn(connection)
    
    return render_template('ventas/ventas_categoria.html', 
                         ventas_categoria=ventas_categoria,
                         fecha=fecha,
                         mes=mes,
                         anio=anio)
