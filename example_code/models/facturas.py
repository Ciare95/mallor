from app.db import connection_pool as mysql
import locale
import psycopg2.extras

try:
    locale.setlocale(locale.LC_ALL, 'es_CO.UTF-8')
except locale.Error:
    print("Warning: 'es_CO.UTF-8' locale not supported. Using default locale.")

class FacturaModel:
    
    def formato_pesos(valor):
        try:
            valor = float(valor)
            return f"${valor:,.0f}".replace(",", ".")
        except (ValueError, TypeError):
            return "$0"
    
    @staticmethod
    def crear_factura(id_proveedor, numero_factura, total):
        # Eliminar espacios en blanco del número de la factura
        numero_factura = numero_factura.replace(" ", "")  # Elimina todos los espacios
        
        connection = mysql.getconn()  # Obtener conexión desde la pool
        cur = connection.cursor()
        try:
            cur.execute("""
                INSERT INTO facturas (id_proveedor, numero_factura, total)
                VALUES (%s, %s, %s)
            """, (id_proveedor, numero_factura, total))
            connection.commit()
            return cur.lastrowid
        finally:
            cur.close()
            if 'connection' in locals():
                mysql.putconn(connection)


    @classmethod
    def agregar_producto_a_factura(cls, id_factura, id_producto, cantidad, precio_compra, precio_venta, porcentaje_iva):
        connection = mysql.getconn()  # Obtener conexión desde la pool
        cursor = connection.cursor()
        try:
            # Verificar si el producto ya está en la factura
            cursor.execute("""
                SELECT COUNT(*) FROM productos_factura 
                WHERE id_factura = %s AND id_producto = %s
            """, (id_factura, id_producto))
            
            if cursor.fetchone()[0] > 0:
                # Si el producto ya está en la factura, no permitir agregarlo
                return False
            
            # Insert into productos_factura
            cursor.execute("""
                INSERT INTO productos_factura 
                (id_factura, id_producto, cantidad, precio_compra, precio_venta, porcentaje_iva)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (id_factura, id_producto, cantidad, precio_compra, precio_venta, porcentaje_iva))
            
            # Update product stock and prices
            cursor.execute("""
                UPDATE productos 
                SET stock = stock + %s,
                    precio = %s,
                    precio_compra = %s
                WHERE id = %s
            """, (cantidad, precio_venta, precio_compra, id_producto))
            
            connection.commit()
            return True
        except Exception as e:
            print(f"Error al agregar producto a factura: {e}")
            return False
        finally:
            cursor.close()
            if 'connection' in locals():
                mysql.putconn(connection)



    @staticmethod
    def obtener_todas_las_facturas():
        connection = mysql.getconn()
        cur = connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
        try:
            cur.execute("""
                SELECT f.*, p.nombre as proveedor_nombre
                FROM facturas f
                LEFT JOIN proveedores p ON f.id_proveedor = p.id
                ORDER BY f.fecha_factura DESC
            """)
            facturas_raw = cur.fetchall()
            
            # Convertir a una lista de diccionarios estándar
            facturas = [dict(row) for row in facturas_raw]
            
            # Formatear el total a pesos colombianos
            for factura in facturas:
                factura['total_formato'] = FacturaModel.formato_pesos(factura.get('total'))
            
            return facturas
        finally:
            cur.close()
            if 'connection' in locals():
                mysql.putconn(connection)

    @staticmethod
    def obtener_id_por_numero_factura(numero_factura):
        connection = mysql.getconn()
        cur = connection.cursor()
        try:
            cur.execute("""
                SELECT id FROM facturas WHERE numero_factura = %s
            """, (numero_factura,))
            resultado = cur.fetchone()
            return resultado[0] if resultado else None
        finally:
            cur.close()
            if 'connection' in locals():
                mysql.putconn(connection)
           
            
    @staticmethod
    def obtener_productos_factura(numero_factura):
        connection = mysql.getconn()
        cursor = connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
        try:
            sql = """
            SELECT 
                p.nombre AS producto_nombre, 
                pf.cantidad, 
                pf.precio_compra,
                COALESCE(pf.porcentaje_iva, 0) as porcentaje_iva,
                pf.precio_compra * (1 + COALESCE(pf.porcentaje_iva, 0)/100) as precio_compra_con_iva,
                pf.cantidad * (pf.precio_compra * (1 + COALESCE(pf.porcentaje_iva, 0)/100)) AS subtotal
            FROM productos p
            JOIN productos_factura pf ON pf.id_producto = p.id
            JOIN facturas f ON pf.id_factura = f.id
            WHERE f.numero_factura = %s
            """
            cursor.execute(sql, (numero_factura,))
            productos_raw = cursor.fetchall()
            productos = [dict(row) for row in productos_raw]

            # Convertir los valores numéricos a float y manejar valores nulos
            for producto in productos:
                producto["precio_compra"] = float(producto["precio_compra"] or 0)
                producto["precio_compra_con_iva"] = float(producto["precio_compra_con_iva"] or 0)
                producto["subtotal"] = float(producto["subtotal"] or 0)
                producto["porcentaje_iva"] = float(producto["porcentaje_iva"] or 0)

            # Calcular el total de la factura con IVA
            total_factura = sum(p["subtotal"] for p in productos)

            # Formatear valores para mostrar en la respuesta
            for producto in productos:
                producto["precio_compra"] = FacturaModel.formato_pesos(producto["precio_compra"])
                producto["precio_compra_con_iva"] = FacturaModel.formato_pesos(producto["precio_compra_con_iva"])
                producto["subtotal"] = FacturaModel.formato_pesos(producto["subtotal"])

            total_factura_formateado = FacturaModel.formato_pesos(total_factura)

            return {"productos": productos, "total_factura": total_factura_formateado}
        
        except Exception as e:
            print(f"Error al obtener los productos: {e}")
            return {"productos": [], "total_factura": 0.0}
        finally:
            if cursor:
                cursor.close()
            if connection:
                mysql.putconn(connection)
