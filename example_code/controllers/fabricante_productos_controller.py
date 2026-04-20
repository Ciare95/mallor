from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from app.db import connection_pool as db
from app.models.productos_fabricados import ProductoFabricado


fabricante_productos_bp = Blueprint('fabricante_productos', __name__)



@fabricante_productos_bp.route('/fabricante')
def listar_productos_fabricados():
    productos = ProductoFabricado.obtener_todos()
    return render_template("fabricante/index.html", productos=productos)




# Rutas principales del módulo fabricante
@fabricante_productos_bp.route('/')
def index():
    # Mostrar todos los productos fabricados
    productos = ProductoFabricado.obtener_todos()
    return render_template('fabricante/index.html', productos=productos)


@fabricante_productos_bp.route('/crear', methods=['GET', 'POST'])
def crear_producto():
    if request.method == 'POST':
        # Crear un nuevo producto fabricado
        nombre = request.form.get('nombre')
        unidad_medida = request.form.get('unidad_medida')
        cantidad_producida = request.form.get('cantidad_producida')

        if not nombre or not unidad_medida or not cantidad_producida:
            return redirect(url_for('fabricante_productos.crear_producto'))

        ProductoFabricado.crear(
            nombre=nombre,
            unidad_medida=unidad_medida,
            costo_total=0,  # Inicialmente 0, se calculará con los ingredientes
            precio_venta=0,  # Valor por defecto
            cantidad_producida=cantidad_producida,
        )

        return redirect(url_for('fabricante_productos.index'))

    return render_template('fabricante/crear_producto.html')


@fabricante_productos_bp.route('/<int:producto_id>/editar', methods=['GET', 'POST'])
def editar_producto(producto_id):
    # Obtener el producto
    producto = ProductoFabricado.obtener_por_id(producto_id)

    if not producto:
        return redirect(url_for('fabricante_productos.index'))

    if request.method == 'POST':
        # Verificar si la actualización es para el costo total o para otros campos
        costo_total = request.form.get('costo_total')
        if costo_total:
            # Validar que el costo total esté presente
            if not costo_total:
                return {"success": False, "message": "El costo total es obligatorio."}, 400

            # Actualizar solo el costo total
            ProductoFabricado.actualizar_costo_total(producto_id=producto_id, costo_total=costo_total)

            return {"success": True, "message": "Costo total actualizado correctamente."}, 200

        # Si no es la actualización de costo total, procesar otros campos
        nombre = request.form.get('nombre')
        unidad_medida = request.form.get('unidad_medida')
        cantidad_producida = request.form.get('cantidad_producida')
        precio_venta = request.form.get('precio_venta')

        if not nombre or not unidad_medida or not cantidad_producida or not precio_venta:
            return redirect(url_for('fabricante_productos.editar_producto', producto_id=producto_id))

        ProductoFabricado.actualizar(
            producto_id=producto_id,
            nombre=nombre,
            unidad_medida=unidad_medida,
            cantidad_producida=cantidad_producida,
            precio_venta=precio_venta
        )

        return redirect(url_for('fabricante_productos.index'))

    return render_template('fabricante/editar_producto.html', producto=producto)




@fabricante_productos_bp.route('/guardar_producto', methods=['POST'])
def guardar_producto():
    datos = request.get_json()
    
    for ingrediente in datos['ingredientes']:
        query = """
            INSERT INTO ingredientes_producto 
            (producto_id, ingrediente_id, cantidad_por_unidad, unidad_cantidad, 
             costo_unitario, unidad_costo, cantidad_original, unidad_original)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            cantidad_por_unidad = VALUES(cantidad_por_unidad),
            unidad_cantidad = VALUES(unidad_cantidad),
            costo_unitario = VALUES(costo_unitario),
            unidad_costo = VALUES(unidad_costo),
            cantidad_original = VALUES(cantidad_original),
            unidad_original = VALUES(unidad_original)
        """
        values = (
            datos['producto_id'],
            ingrediente['ingrediente_id'],
            ingrediente['cantidad_por_unidad'],
            ingrediente['unidad_cantidad'],
            ingrediente['costo_unitario'],
            ingrediente['unidad_costo'],
            ingrediente['cantidad_original'],
            ingrediente['unidad_original']
        )
        
        connection = db.getconn()
        try:
            with connection.cursor() as cursor:
                cursor.execute(query, values)
            connection.commit()
        finally:
            if connection and connection.closed == 0:
                db.putconn(connection)
    
    return jsonify({'success': True})

    




@fabricante_productos_bp.route('/<int:producto_id>/eliminar', methods=['POST'])
def eliminar_producto(producto_id):
    # Eliminar un producto fabricado
    producto = ProductoFabricado.obtener_por_id(producto_id)

    if not producto:
        return redirect(url_for('fabricante.index'))

    ProductoFabricado.eliminar(producto_id)
    return redirect(url_for('fabricante.index'))



@fabricante_productos_bp.route('/ver_producto_fabricado/<int:producto_id>', methods=['GET'])
def ver_producto_fabricado(producto_id):
    # Obtener el producto por ID
    producto = ProductoFabricado.obtener_por_id(producto_id)
    if not producto:
        return redirect(url_for('fabricante.index'))

    # Obtener los ingredientes asociados al producto
    ingredientes = producto.obtener_ingredientes()

    # Preparar los datos para la plantilla
    ingredientes_data = []
    for ingrediente in ingredientes:
        ingredientes_data.append({
            'id': ingrediente['ingrediente_id'],  
            'nombre': ingrediente['nombre'],
            'costo_factura': ingrediente['costo_factura'],
            'costo_ing_por_producto': ingrediente['costo_ing_por_producto'],
            'unidad_medida': ingrediente['unidad_medida'],
            'cantidad_ing': ingrediente['cantidad_ing'],
            'cantidad_factura': ingrediente['cantidad_factura'],
            'costo_empaque': ingrediente['costo_empaque'],
        })

    # Renderizar la plantilla con los datos
    return render_template(
        'fabricante/ver_producto_fabricado.html',
        producto=producto,
        ingredientes=ingredientes_data
    )



@fabricante_productos_bp.route('/listar', methods=['GET'])
def listar_productos():
    try:
        conexion = db.getconn()
        cursor = conexion.cursor()
        
        termino_busqueda = request.args.get('q', '').strip()
        
        if termino_busqueda:
            query = """
                SELECT id, nombre, unidad_medida, costo_total, precio_venta, cantidad_producida 
                FROM productos_fabricados
                WHERE nombre LIKE %s
                ORDER BY nombre ASC
            """
            cursor.execute(query, ('%' + termino_busqueda + '%',))
        else:
            query = """
                SELECT id, nombre, unidad_medida, costo_total, precio_venta, cantidad_producida 
                FROM productos_fabricados
                ORDER BY nombre ASC
            """
            cursor.execute(query)
        
        productos_raw = cursor.fetchall()
        
        # Convert tuple results to ProductoFabricado objects
        productos = []
        for row in productos_raw:
            # Calcular ganancia neta y porcentaje de rentabilidad
            ganancia_neta = (row[4] - row[3]) if row[3] is not None else 0
            porcentaje_rentabilidad = (ganancia_neta * 100 / row[4]) if row[4] > 0 else 0
            
            producto = ProductoFabricado(
                id=row[0],
                nombre=row[1],
                unidad_medida=row[2],
                costo_total=row[3],
                precio_venta=row[4],
                cantidad_producida=row[5],
                ganancia_neta=ganancia_neta,
                porcentaje_rentabilidad=porcentaje_rentabilidad
            )
            productos.append(producto)
        
        return render_template('fabricante/index.html', productos=productos)
    
    finally:
        if cursor:
            cursor.close()
        if 'conexion' in locals() and conexion.closed == 0:
            db.putconn(conexion)
