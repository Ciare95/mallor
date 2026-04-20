from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from app.models.productos_fabricados import ProductoFabricado
from app.models.ingredientes_productos import IngredienteProducto
from app.models.ingrediente import Ingrediente
from app.controllers.fabricante_utilidades_controller import convertir_unidad
from app.models.facturas_fabricacion import FacturaFabricacion
from app.models.ingredientes_factura import IngredienteFactura
from app.models.proveedor import ProveedorModel
import decimal
from app.db import connection_pool as db

fabricante_ingredientes_bp = Blueprint('fabricante_ingredientes', __name__)

def get_conversion_factor(unidad_origen, unidad_destino):
    conversiones = {
            'gramos': { 'kilos': 0.001, 'litros': 0.001, 'mililitros': 1, 'cc': 1, 'galon': 0.000264172, 'garrafa': 0.00005 },
            'kilos': { 'gramos': 1000, 'litros': 1, 'mililitros': 1000, 'cc': 1000, 'galon': 0.264172, 'garrafa': 0.05 },
            'litros': { 'gramos': 1000, 'kilos': 1, 'mililitros': 1000, 'cc': 1000, 'galon': 0.264172, 'garrafa': 0.05 },
            'mililitros': { 'gramos': 1, 'kilos': 0.001, 'litros': 0.001, 'cc': 1, 'galon': 0.000264172, 'garrafa': 0.00005 },
            'cc': { 'gramos': 1, 'kilos': 0.001, 'litros': 0.001, 'mililitros': 1, 'galon': 0.000264172, 'garrafa': 0.00005 },
            'galon': { 'gramos': 4000, 'kilos': 4, 'litros': 4, 'mililitros': 4000, 'cc': 4000, 'garrafa': 0.2 },
            'garrafa': { 'gramos': 20000, 'kilos': 20, 'litros': 20, 'mililitros': 20000, 'cc': 20000, 'galon': 5 }
    }
    return conversiones.get(unidad_origen, {}).get(unidad_destino, 1)




@fabricante_ingredientes_bp.route('/crear_ingrediente', methods=['GET', 'POST'])
def crear_ingrediente():
    if request.method == 'POST':
        nombre = request.form['nombre']
        descripcion = request.form.get('descripcion', '')

        # Llamamos al método para crear el ingrediente
        Ingrediente.crear(nombre, descripcion)

        return redirect(url_for('fabricante_ingredientes.listar_ingredientes'))

    return render_template('fabricante/crear_ingrediente.html')


@fabricante_ingredientes_bp.route('/listar_ingredientes')
def listar_ingredientes():
    # Obtener todos los ingredientes
    ingredientes = Ingrediente.obtener_todos()
    return render_template('fabricante/listar_ingredientes.html', ingredientes=ingredientes)


@fabricante_ingredientes_bp.route('/editar_ingrediente/<int:id>', methods=['GET', 'POST'])
def editar_ingrediente(id):
    ingrediente = Ingrediente.obtener_por_id(id)
    if request.method == 'POST':
        nombre = request.form['nombre']
        descripcion = request.form.get('descripcion', '')
        Ingrediente.actualizar(id, nombre, descripcion)
        return redirect(url_for('fabricante_ingredientes.listar_ingredientes'))
    return render_template('fabricante/editar_ingredientes.html', ingrediente=ingrediente)

@fabricante_ingredientes_bp.route('/eliminar_ingrediente/<int:id>', methods=['POST'])
def eliminar_ingrediente(id):
    Ingrediente.eliminar(id)
    return redirect(url_for('fabricante_ingredientes.listar_ingredientes'))



@fabricante_ingredientes_bp.route('/<int:producto_id>/asignar_ingredientes', methods=['GET', 'POST'])
def asignar_ingredientes(producto_id):
    producto = ProductoFabricado.obtener_por_id(producto_id)
    if not producto:
        return redirect(url_for('fabricante_productos.index'))


    ingredientes = Ingrediente.obtener_todos()
    relaciones_existentes = IngredienteProducto.obtener_por_producto(producto.id)
    
    return render_template('fabricante/asignar_ingredientes.html',
                         producto=producto,
                         ingredientes=ingredientes,
                         relaciones=relaciones_existentes)
    




@fabricante_ingredientes_bp.route('/guardar_ingredientes', methods=['POST'])
def guardar_ingredientes():

    try:
        datos = request.get_json()
        print(datos)
        if not datos:
            return jsonify({'error': 'No se recibieron datos'}), 400

        producto_id = datos.get('producto_id')
        ingredientes = datos.get('ingredientes', [])

        if not producto_id or not ingredientes:
            return jsonify({'error': 'Datos incompletos'}), 400

        for ingrediente in ingredientes:
            Ingrediente.guardar_ingrediente({
                'producto_id': producto_id,
                'ingrediente_id': ingrediente['id'],
                'costo_factura': ingrediente['costo_factura'],
                'costo_ing_por_producto': ingrediente['costo_ing_por_producto'],
                'unidad_medida': ingrediente['unidad_medida'],
                'cantidad_ing': ingrediente['cantidad_ing'],
                'cantidad_factura': ingrediente['cantidad_factura']
            })

        # Actualizar el costo total del producto fabricado
        costo_total = Ingrediente.obtener_costo_total(producto_id)
        ProductoFabricado.actualizar_costo_total(producto_id, costo_total)

        return jsonify({'message': 'Ingredientes guardados correctamente'}), 200
    

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Ocurrió un error al guardar los ingredientes'}), 500


        
@fabricante_ingredientes_bp.route('/editar', methods=['POST'])
def editar():
    try:
        print("Datos recibidos:", request.form)  # Log de datos recibidos
        ingrediente_id = request.form.get('ingrediente_id')
        print("ID del ingrediente:", ingrediente_id)  # Log del ID específico
        
        # Validar ID primero
        try:
            ingrediente_id = int(ingrediente_id)
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "ID de ingrediente inválido"
            }), 400

        # Obtener resto de campos
        costo_factura = request.form.get('costo_factura')
        unidad_medida = request.form.get('unidad_medida')
        cantidad_ing = request.form.get('cantidad_ing')
        cantidad_factura = request.form.get('cantidad_factura')
        costo_ing_por_producto = request.form.get('costo_ing_por_producto')
        costo_empaque = request.form.get('costo_empaque')

        # Validar campos requeridos
        required_fields = {
            'costo_factura': costo_factura,
            'unidad_medida': unidad_medida,
            'cantidad_ing': cantidad_ing,
            'cantidad_factura': cantidad_factura,
            'costo_ing_por_producto': costo_ing_por_producto,
            'costo_empaque': costo_empaque
        }

        missing_fields = [k for k, v in required_fields.items() if not v]
        if missing_fields:
            return jsonify({
                "success": False,
                "message": f"Campos requeridos faltantes: {', '.join(missing_fields)}"
            }), 400

        # Validar unidades de medida
        valid_units = ['gramos', 'kilos', 'litros', 'mililitros', 'cc', 'galon', 'garrafa']
        if unidad_medida not in valid_units or cantidad_factura not in valid_units:
            return jsonify({
                "success": False,
                "message": "Unidad de medida inválida"
            }), 400

        # Convertir y validar valores numéricos
        try:
            valores_numericos = {
                'costo_factura': decimal.Decimal(costo_factura),
                'cantidad_ing': decimal.Decimal(cantidad_ing),
                'costo_ing_por_producto': decimal.Decimal(costo_ing_por_producto),
                'costo_empaque': decimal.Decimal(costo_empaque)
            }

            # Validar que los valores sean positivos
            for campo, valor in valores_numericos.items():
                if valor <= 0:
                    return jsonify({
                        "success": False,
                        "message": f"El campo {campo} debe ser mayor que 0"
                    }), 400

        except decimal.InvalidOperation:
            return jsonify({
                "success": False,
                "message": "Valores numéricos inválidos"
            }), 400

        # Actualizar el registro
        IngredienteProducto.actualizar(
            ingrediente_id,
            valores_numericos['costo_factura'],
            unidad_medida,
            valores_numericos['cantidad_ing'],
            cantidad_factura,
            valores_numericos['costo_ing_por_producto'],
            valores_numericos['costo_empaque']
        )
        
        return jsonify({
            "success": True,
            "message": "Ingrediente actualizado correctamente"
        })

    except Exception as e:
        print(f"Error al actualizar ingrediente: {e}")
        return jsonify({
            "success": False,
            "message": f"Error al actualizar: {str(e)}"
        }), 500
        

@fabricante_ingredientes_bp.route('/factura_ingredientes', methods=['GET'])
def factura_ingredientes():
    connection = db.getconn()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, nombre FROM proveedores")
            proveedores = [{'id': row[0], 'nombre': row[1]} for row in cursor.fetchall()]
            
            cursor.execute("SELECT id, nombre FROM ingredientes")
            ingredientes = [{'id': row[0], 'nombre': row[1]} for row in cursor.fetchall()]
    finally:
        if connection and connection.closed == 0:
            db.putconn(connection)
    
    return render_template('fabricante/factura_ingredientes.html', 
                         proveedores=proveedores,
                         ingredientes=ingredientes)
    

@fabricante_ingredientes_bp.route('/crear_factura', methods=['POST'])
def crear_factura():
    try:
        numero_factura = request.form['numero_factura']
        id_proveedor = request.form['proveedor']
        total = request.form['total']
        
        connection = db.getconn()
        try:
            with connection.cursor() as cursor:
                # Crear la factura en facturas_fabricacion
                query = """
                INSERT INTO facturas_fabricacion (numero_factura, id_proveedor, total)
                VALUES (%s, %s, %s)
                """
                cursor.execute(query, (numero_factura, id_proveedor, total))
                id_factura = cursor.lastrowid
                
                connection.commit()
        finally:
            if connection and connection.closed == 0:
                db.putconn(connection)
        
        return jsonify({'success': True, 'id_factura': id_factura})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    

@fabricante_ingredientes_bp.route('/agregar_ingrediente_factura', methods=['POST'])
def agregar_ingrediente_factura():
    connection = None
    try:
        connection = db.getconn()
        with connection.cursor() as cursor:
            # Verificar si la factura existe
            check_query = "SELECT id FROM facturas_fabricacion WHERE id = %s"
            cursor.execute(check_query, (request.form['id_factura'],))
            if not cursor.fetchone():
                raise Exception("La factura no existe")
            
            cantidad = float(request.form['cantidad'])
            precio_unitario = float(request.form['precio_unitario'])
            iva = float(request.form['iva'])
            transporte = float(request.form['transporte'])
            costo_final = float(request.form['costo_final'])
            
            # Insertar el ingrediente en la factura
            query = """
            INSERT INTO ingredientes_factura 
            (id_factura, id_ingrediente, cantidad, precio_unitario, 
             medida_ingrediente, iva, transporte, costo_final)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                request.form['id_factura'],
                request.form['id_ingrediente'],
                cantidad,
                precio_unitario,
                request.form['unidad_medida'],
                iva,
                transporte,
                costo_final
            ))
            
            inserted_id = cursor.lastrowid
            
            # Obtener el subtotal generado
            get_subtotal_query = "SELECT subtotal FROM ingredientes_factura WHERE id = %s"
            cursor.execute(get_subtotal_query, (inserted_id,))
            subtotal = cursor.fetchone()[0]
            
            # Actualizar el total de la factura
            update_total_query = """
            UPDATE facturas_fabricacion 
            SET total = COALESCE((
                SELECT SUM(subtotal) 
                FROM ingredientes_factura 
                WHERE id_factura = %s
            ), 0)
            WHERE id = %s
            """
            cursor.execute(update_total_query, (
                request.form['id_factura'],
                request.form['id_factura']
            ))
            
            # Actualizar el costo_factura en la tabla ingredientes_producto
            update_costo_factura_query = """
            UPDATE ingredientes_producto
            SET costo_factura = %s
            WHERE ingrediente_id = %s
            """
            cursor.execute(update_costo_factura_query, (
                precio_unitario,
                request.form['id_ingrediente']
            ))
            
            connection.commit()
            
            return jsonify({
                'success': True,
                'message': 'Ingrediente agregado correctamente',
                'id': inserted_id,
                'subtotal': float(subtotal)
            })
            
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({'success': False, 'error': str(e)})
    finally:
        if connection and connection.closed == 0:
            db.putconn(connection)


@fabricante_ingredientes_bp.route('/mostrar_facturas')
def mostrar_facturas():
    try:
        # Recuperar los filtros de la URL
        fecha = request.args.get('fecha')
        mes = request.args.get('mes')
        anio = request.args.get('anio')

        # Obtener las facturas filtradas
        facturas = FacturaFabricacion.obtener_con_filtros(fecha=fecha, mes=mes, anio=anio)

        return render_template('fabricante/listar_facturas.html', facturas=facturas, fecha=fecha, mes=mes, anio=anio)
    
    except Exception as e:
        print(f"Error: {e}")
        return render_template('fabricante/listar_facturas.html', facturas=[], error="Error al cargar facturas")

    
    
@fabricante_ingredientes_bp.route('/ver_factura/<int:id_factura>')
def ver_factura(id_factura):
    try:
        ingredientes = IngredienteFactura.obtener_por_id(id_factura)
        
        for ingrediente in ingredientes:
                ingrediente['cantidad'] = float(ingrediente['cantidad'])
                ingrediente['precio_unitario'] = float(ingrediente['precio_unitario'])
                ingrediente['subtotal'] = float(ingrediente['subtotal'])
                ingrediente['iva'] = float(ingrediente['iva']) if ingrediente['iva'] is not None else 0
                ingrediente['transporte'] = float(ingrediente['transporte']) if ingrediente['transporte'] is not None else 0
                ingrediente['costo_final'] = float(ingrediente['costo_final']) if ingrediente['costo_final'] is not None else 0
        
        return render_template('fabricante/ver_factura.html', ingredientes=ingredientes)
    except Exception as e:
        print(f"Error: {e}")
        return render_template('fabricante/ver_factura.html', ingredientes=[], error="Error al cargar la factura")
    
    
@fabricante_ingredientes_bp.route('/editar_factura/<int:factura_id>')
def editar_factura(factura_id):
    try:
        # Obtener la factura
        connection = db.getconn()
        with connection.cursor() as cursor:
            # Obtener datos de la factura
            cursor.execute("""
                SELECT ff.id, ff.fecha, ff.numero_factura, p.nombre as nombre_proveedor
                FROM facturas_fabricacion ff
                JOIN proveedores p
                ON ff.id_proveedor = p.id
                WHERE ff.id = %s
            """, (factura_id,))
            row = cursor.fetchone()
            factura = {
                'id': row[0],
                'fecha': row[1],
                'numero_factura': row[2],
                'nombre_proveedor': row[3]
            } if row else None
            
            if not factura:
                flash('Factura no encontrada', 'error')
                return redirect(url_for('fabricante_ingredientes.mostrar_facturas'))

            # Obtener ingredientes de la factura
            ingredientes = IngredienteFactura.obtener_por_id(factura_id)
            
            for ingrediente in ingredientes:
                ingrediente['cantidad'] = float(ingrediente['cantidad'])
                ingrediente['precio_unitario'] = float(ingrediente['precio_unitario'])
                ingrediente['subtotal'] = float(ingrediente['subtotal'])
                ingrediente['iva'] = float(ingrediente['iva']) if ingrediente['iva'] is not None else 0
                ingrediente['transporte'] = float(ingrediente['transporte']) if ingrediente['transporte'] is not None else 0
                ingrediente['costo_final'] = float(ingrediente['costo_final']) if ingrediente['costo_final'] is not None else 0
            
            # Obtener todos los ingredientes disponibles
            ingredientes_disponibles = Ingrediente.obtener_todos()

            return render_template('fabricante/editar_factura.html',
                               factura=factura,
                               ingredientes=ingredientes,
                               todos_ingredientes=ingredientes_disponibles,
                               editing=True)
    
    except Exception as e:
        flash(f'Error al cargar la factura: {str(e)}', 'error')
        return redirect(url_for('fabricante_ingredientes.mostrar_facturas'))
    finally:
        if 'connection' in locals() and connection.closed == 0:
            db.putconn(connection)
    

@fabricante_ingredientes_bp.route('/eliminar_ingrediente_factura/<int:ingrediente_id>', methods=['POST'])
def eliminar_ingrediente_factura(ingrediente_id):
    try:
        connection = db.getconn()
        with connection.cursor() as cursor:
            # Eliminar el ingrediente de la factura
            query = "DELETE FROM ingredientes_factura WHERE id = %s"
            cursor.execute(query, (ingrediente_id,))
            connection.commit()
            
            return jsonify({'success': True})
            
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({'success': False, 'error': str(e)})
    finally:
        if 'connection' in locals() and connection.closed == 0:
            db.putconn(connection)
            

@fabricante_ingredientes_bp.route('/eliminar_factura/<int:factura_id>', methods=['GET'])
def eliminar_factura(factura_id):
    conexion = db.getconn()
    cursor = None
    try:
        cursor = conexion.cursor()
        # Eliminar la factura directamente
        sql_eliminar_factura = "DELETE FROM facturas_fabricacion WHERE id = %s"
        cursor.execute(sql_eliminar_factura, (factura_id,))
        conexion.commit()
        flash("Factura eliminada exitosamente.", "success")
    except Exception as e:
        print(f"Error al eliminar la factura: {e}")
        flash("Hubo un error al intentar eliminar la factura.", "danger")
    finally:
        if cursor:
            cursor.close()
        if 'conexion' in locals() and conexion.closed == 0:
            db.putconn(conexion)

    return redirect(url_for('fabricante_ingredientes.mostrar_facturas'))


@fabricante_ingredientes_bp.route('/buscar')
def buscar_ingrediente():
    try:
        query = request.args.get('q', '')
        if len(query) < 2:
            return jsonify([])
        
        connection = db.getconn()
        cursor = connection.cursor()  # Quitamos dictionary=True ya que no lo soporta
        
        sql = """
            SELECT id, nombre 
            FROM ingredientes 
            WHERE nombre LIKE %s 
            ORDER BY nombre 
            LIMIT 10
        """
        cursor.execute(sql, (f'%{query}%',))
        filas = cursor.fetchall()
        
        # Convertimos las tuplas a diccionarios
        resultados = [{'id': fila[0], 'nombre': fila[1]} for fila in filas]
        
        if cursor:
            cursor.close()
        if 'connection' in locals() and connection.closed == 0:
            db.putconn(connection)
        
        return jsonify(resultados)
        
    except Exception as e:
        print(f"Error en búsqueda de ingredientes: {str(e)}")
        return jsonify([])  # Devolvemos lista vacía en caso de error
    
    
@fabricante_ingredientes_bp.route('/actualizar_factura/<int:id>', methods=['GET', 'POST'])
def actualizar_factura(id):
    try:
        if request.method == 'GET':
            # Get the current factura data to populate the form
            factura = FacturaFabricacion.obtener_factura_por_id(id)
            proveedores = ProveedorModel.obtener_proveedores()
            return render_template('fabricante/actualizar_factura.html', 
                                factura=factura, 
                                proveedores=proveedores)
        
        elif request.method == 'POST':
            # Handle the form submission
            numero_factura = request.form['numero_factura']
            id_proveedor = request.form['id_proveedor']
            total = request.form['total']
            
            FacturaFabricacion.actualizar_factura(numero_factura, id_proveedor, total, id)
            
            # Redirect to the list after successful update
            return redirect(url_for('fabricante_ingredientes.mostrar_facturas'))

    except Exception as e:
        print(f"Error: {e}")
        return render_template('fabricante/listar_facturas.html', 
                             ingredientes=[], 
                             error="Error al procesar la factura")
    
    
@fabricante_ingredientes_bp.route('/eliminar_ingrediente_producto/<int:ingrediente_id>', methods=['DELETE'])
def eliminar_ingrediente_producto(ingrediente_id):
    try:
        data = request.get_json()
        producto_id = data.get('producto_id')
        IngredienteProducto.eliminar_ingrediente(producto_id, ingrediente_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
