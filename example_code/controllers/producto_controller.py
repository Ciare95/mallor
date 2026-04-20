from flask import jsonify, render_template, request, redirect, url_for, Blueprint, flash
import decimal
from psycopg2.extras import DictCursor
from app.models.categorias import Categoria
from app.models.productos import Producto
from app.db import connection_pool
from app.models.facturas import FacturaModel
from flask_login import login_required
from app.controllers.usuario_controller import administrador_requerido

# Definir el Blueprint para productos
producto_bp = Blueprint("producto", __name__, url_prefix="/productos")


@producto_bp.route('/productos', methods=['GET'])
def listar_productos():
    producto = Producto()
    productos, total_rentabilidad = producto.obtener_todos()
    categoria = Categoria()
    categorias = categoria.obtener_categorias()
    return render_template('productos/listar.html', productos=productos, categorias=categorias, total_rentabilidad=total_rentabilidad)


@producto_bp.route("/crear", methods=['POST'])
@login_required
@administrador_requerido
def crear_producto():
    if request.method == 'POST':
        try:
            # Log de datos recibidos
            print("DEBUG - Datos recibidos en crear_producto:")
            for key, value in request.form.items():
                print(f"  {key}: {value}")
            print(f"  es_servicio: {'es_servicio' in request.form}")
            
            producto = Producto()
            producto.nombre = request.form['nombre']
            producto.id_categorias = int(request.form['categoria']) if request.form['categoria'].isdigit() else None
            producto.es_servicio = 'es_servicio' in request.form
            
            # Convertir valores numéricos y manejar casos edge
            if producto.es_servicio:
                producto.cantidad = None
            else:
                stock = request.form['stock'].strip()
                producto.cantidad = int(stock) if stock and stock.isdigit() else 0
            
            precio_compra = request.form['precio_compra'].strip()
            producto.precio_compra = float(precio_compra) if precio_compra else 0.0
            
            precio = request.form['precio'].strip()
            producto.precio = float(precio) if precio else 0.0
            
            if producto.crear_producto():
                flash("Producto/Servicio creado correctamente.", "success")
            else:
                flash("Error al crear el producto/servicio. Inténtalo de nuevo.", "danger")
        except ValueError as e:
            flash(f"Error en los datos numéricos: {str(e)}", "danger")
        except Exception as e:
            flash(f"Error inesperado: {str(e)}", "danger")
    return redirect(url_for('producto.listar_productos'))

@producto_bp.route("/editar/<int:id>", methods=['GET', 'POST'])
@login_required
@administrador_requerido
def editar_producto(id):
    producto = Producto()
    producto.obtener_por_id(id)
    
    if request.method == 'POST':
        try:
            producto.nombre = request.form['nombre']
            producto.id_categorias = request.form['categoria']
            producto.es_servicio = 'es_servicio' in request.form
            
            # Convertir valores numéricos y manejar casos edge
            if producto.es_servicio:
                producto.cantidad = None
            else:
                stock = request.form['stock'].strip()
                producto.cantidad = int(stock) if stock and stock.isdigit() else 0
            
            precio_compra = request.form['precio_compra'].strip()
            producto.precio_compra = float(precio_compra) if precio_compra else 0.0
            
            precio = request.form['precio'].strip()
            producto.precio = float(precio) if precio else 0.0
            
            if producto.actualizar_producto():
                flash("Producto/Servicio actualizado correctamente.", "success")
            else:
                flash("Error al actualizar el producto/servicio. Inténtalo de nuevo.", "danger")
        except ValueError as e:
            flash(f"Error en los datos numéricos: {str(e)}", "danger")
        except Exception as e:
            flash(f"Error inesperado: {str(e)}", "danger")
    return redirect(url_for('producto.listar_productos'))


@producto_bp.route("/eliminar/<int:id>", methods=['POST'])
@login_required
@administrador_requerido  # Solo los administradores pueden acceder a esta ruta
def eliminar_producto(id):
    producto = Producto(id=id)
    try:
        if producto.eliminar_producto():
            flash("Producto eliminado correctamente.", "success")
        else:
            flash("No se pudo eliminar el producto. Tiene ventas relacionadas.", "danger")
    except Exception as e:
        if "foreign key constraint fails" in str(e).lower():
            flash(
                "El producto no puede ser eliminado porque tiene relaciones activas con otras tablas.",
                "danger",
            )
        else:
            flash(f"Error inesperado: {str(e)}", "danger")
    return redirect(url_for('producto.listar_productos'))


@producto_bp.route('/buscar/<termino>', methods=['GET'])
def buscar_producto(termino):
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()

        query = """
            SELECT id, nombre, precio, precio_compra FROM productos
            WHERE nombre LIKE %s OR CAST(id AS TEXT) LIKE %s
        """
        cursor.execute(query, (f"%{termino}%", f"%{termino}%"))
        productos = cursor.fetchall()
        cursor.close()
        connection_pool.putconn(connection)

        # Convertir resultados a lista de diccionarios
        productos_list = []
        for row in productos:
            productos_list.append({
                'id': row[0],
                'nombre': row[1].upper() if row[1] else '',
                'precio': float(row[2]) if row[2] is not None else 0,
                'precio_compra': float(row[3]) if row[3] is not None else 0
            })

        return jsonify(productos_list)
    except Exception as e:
        flash(f"Error al buscar el producto: {str(e)}", "danger")
        return jsonify({"error": str(e)}), 500


@producto_bp.route('/ingreso_producto')
def ingreso_producto():
    numero_factura = request.args.get('numero_factura')
    if not numero_factura:
        flash('Número de factura no proporcionado', 'danger')
        return redirect(url_for('factura.lista_facturas'))
    
    return render_template('informes/ingreso_producto.html', numero_factura=numero_factura)

@producto_bp.route('/factura/<numero_factura>')
def obtener_productos_factura(numero_factura):
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor(cursor_factory=DictCursor)

        # Primero obtener el ID de la factura
        cursor.execute("""
            SELECT id FROM facturas WHERE numero_factura = %s
        """, (numero_factura,))
        factura = cursor.fetchone()

        if not factura:
            cursor.close()
            connection_pool.putconn(connection)
            return jsonify({'error': 'Factura no encontrada'}), 404

        # Obtener los productos de la factura
        cursor.execute("""
            SELECT 
                pf.id,
                p.nombre,
                pf.cantidad,
                pf.precio_compra,
                pf.precio_venta,
                pf.porcentaje_iva
            FROM productos_factura pf
            JOIN productos p ON pf.id_producto = p.id
            WHERE pf.id_factura = %s
        """, (factura['id'],))

        productos = cursor.fetchall()
        
        # Convertir decimales a float para JSON
        productos_list = []
        for p in productos:
            producto_dict = dict(p)
            for key, value in producto_dict.items():
                if isinstance(value, decimal.Decimal):
                    producto_dict[key] = float(value)
            productos_list.append(producto_dict)

        cursor.close()
        connection.close()
        return jsonify(productos_list)

    except Exception as e:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()
        return jsonify({'error': str(e)}), 500

@producto_bp.route('/registro_ingresos/agregar_producto', methods=['POST'])
def agregar_producto():
    connection = None
    cursor = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor(cursor_factory=DictCursor)
        data = request.get_json()

        # Iniciar transacción
        connection.autocommit = False

        # Obtener el ID de la factura
        cursor.execute("SELECT id FROM facturas WHERE numero_factura = %s", (data['numero_factura'],))
        factura = cursor.fetchone()

        if not factura:
            return jsonify({'error': 'Factura no encontrada'}), 404

        # Actualizar el producto en la tabla productos
        cursor.execute(
            "UPDATE productos SET stock = stock + %s, precio = %s, precio_compra = %s WHERE id = %s",
            (int(data['cantidad']), float(data['precio_venta']), float(data['precio_compra']), int(data['id_producto']))
        )

        # Insertar el nuevo producto en productos_factura
        cursor.execute(
            "INSERT INTO productos_factura (id_factura, id_producto, cantidad, precio_compra, precio_venta, porcentaje_iva) VALUES (%s, %s, %s, %s, %s, %s)",
            (factura['id'], data['id_producto'], data['cantidad'], data['precio_compra'], data['precio_venta'], data['porcentaje_iva'])
        )

        # Calcular y actualizar el total de la factura
        cursor.execute("SELECT SUM(precio_compra * cantidad) as total FROM productos_factura WHERE id_factura = %s", (factura['id'],))
        total = cursor.fetchone()['total'] or 0

        cursor.execute("UPDATE facturas SET total = %s WHERE id = %s", (total, factura['id']))

        # Confirmar la transacción
        connection.commit()
        
        return jsonify({'message': 'Producto agregado exitosamente y stock actualizado'})

    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection_pool.putconn(connection)

@producto_bp.route('/eliminar_producto/<int:producto_id>', methods=['DELETE'])
def eliminar_producto_factura(producto_id):
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor(cursor_factory=DictCursor)

        # Iniciar transacción
        connection.start_transaction()

        # Obtener la información del producto antes de eliminarlo
        cursor.execute("""
            SELECT pf.id_factura, pf.id_producto, pf.cantidad, pf.precio_compra 
            FROM productos_factura pf 
            WHERE pf.id = %s
        """, (producto_id,))
        producto = cursor.fetchone()

        if not producto:
            cursor.close()
            connection.close()
            return jsonify({'error': 'Producto no encontrado'}), 404

        # Actualizar el stock en la tabla productos (restar la cantidad)
        cursor.execute("""
            UPDATE productos 
            SET stock = stock - %s
            WHERE id = %s
        """, (producto['cantidad'], producto['id_producto']))

        # Eliminar el producto de productos_factura
        cursor.execute("""
            DELETE FROM productos_factura WHERE id = %s
        """, (producto_id,))

        # Recalcular el total de la factura
        cursor.execute("""
            SELECT SUM(precio_compra * cantidad) as total
            FROM productos_factura
            WHERE id_factura = %s
        """, (producto['id_factura'],))
        nuevo_total = cursor.fetchone()['total'] or 0

        # Actualizar el total en la factura
        cursor.execute("""
            UPDATE facturas 
            SET total = %s 
            WHERE id = %s
        """, (nuevo_total, producto['id_factura']))

        # Confirmar la transacción
        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({'message': 'Producto eliminado exitosamente y stock actualizado'})

    except Exception as e:
        # Revertir cambios si hay error
        if 'connection' in locals():
            connection.rollback()
            cursor.close()
            connection.close()
        return jsonify({'error': str(e)}), 500
