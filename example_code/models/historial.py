from app.db import connection_pool
from mysql.connector import Error
from datetime import datetime

class HistorialModel:
    @staticmethod
    def formato_peso_colombiano(valor):
        if valor is None:
            return "0"
        return f"{'{:,.0f}'.format(float(valor)).replace(',', '.')}"
    

    @staticmethod
    def obtener_ventas_generales(where_clause="", parametros=None):
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor()
            # Verificar parámetros con logging detallado
            print(f"Parámetros recibidos en modelo: {parametros} (tipo: {type(parametros)})")
            if parametros is not None:
                if not isinstance(parametros, (tuple, list)):
                    raise ValueError(f"Los parámetros deben ser una tupla o lista, no {type(parametros)}")
                print(f"Parámetros validados: {parametros}")
                
            # Query simplificada usando el total_venta directamente de la tabla ventas
            query_ventas = f"""
                SELECT 
                    v.id AS id_venta, 
                    v.fecha_venta, 
                    v.total_venta,
                    v.estado, 
                    v.saldo, 
                    c.nombre AS cliente,
                    u.nombre AS usuario
                FROM ventas v
                JOIN clientes c ON v.id_cliente = c.id
                LEFT JOIN usuarios u ON v.id_usuarios = u.id
                {where_clause}
                ORDER BY v.fecha_venta DESC
            """
            
            # Query para totales también simplificada
            query_totales = f"""
                SELECT 
                    COALESCE(SUM(total_venta), 0) as total_ventas,
                    COALESCE(SUM(saldo), 0) as total_saldos
                FROM ventas v
                {where_clause}
            """
            
            print("Query completa ventas:", query_ventas % (parametros or ()))
            cursor.execute(query_ventas, parametros or ())
            resultados = cursor.fetchall()
            
            print("Query completa totales:", query_totales % (parametros or ()))
            cursor.execute(query_totales, parametros or ())
            totales = cursor.fetchone()

            # Formatear resultados
            formatted_results = []
            for row in resultados:
                formatted = {
                    'id_venta': row[0],
                    'fecha_venta': row[1].strftime('%Y-%m-%d %H:%M') if row[1] else None,
                    'total_venta': HistorialModel.formato_peso_colombiano(row[2]),
                    'estado': row[3],
                    'saldo': HistorialModel.formato_peso_colombiano(row[4]),
                    'cliente': row[5],
                    'usuario': row[6]
                }
                formatted_results.append(formatted)
            
            total_ventas = totales[0] if totales else 0
            total_saldos = totales[1] if totales else 0
            total_neto = total_ventas - total_saldos
            
            totales_formateados = {
                'total_ventas': HistorialModel.formato_peso_colombiano(total_ventas),
                'total_saldos': HistorialModel.formato_peso_colombiano(total_saldos),
                'total_neto': HistorialModel.formato_peso_colombiano(total_neto)
            }
            
            return formatted_results, totales_formateados
        finally:
            if cursor:
                cursor.close()
            if 'connection' in locals():
                connection_pool.putconn(connection)

            
    @staticmethod
    def obtener_ventas_por_cliente(cliente_id, estado='todas'):
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor()
            
            # Construir la consulta base con JOIN para obtener el nombre del vendedor
            query = """
                SELECT v.id AS id_venta, v.fecha_venta, 
                    SUM(dv.cantidad * p.precio) AS total_venta, 
                    v.estado, v.saldo, u.nombre AS usuario
                FROM ventas v
                JOIN detalle_ventas dv ON v.id = dv.id_ventas
                JOIN productos p ON dv.id_productos = p.id
                JOIN usuarios u ON v.id_usuarios = u.id  -- Unir con la tabla usuarios para obtener el nombre
                WHERE v.id_cliente = %s
            """
            
            # Filtrar por estado si se proporciona
            if estado != 'todas':
                query += " AND v.estado = %s"
            
            # Ordenar por fecha - incluir todas las columnas no agregadas en el GROUP BY
            query += " GROUP BY v.id, v.fecha_venta, v.estado, v.saldo, u.nombre ORDER BY v.fecha_venta DESC"
            
            # Ejecutar la consulta
            if estado != 'todas':
                cursor.execute(query, (cliente_id, estado))
            else:
                cursor.execute(query, (cliente_id,))
            
            ventas_rows = cursor.fetchall()
            
            formatted_ventas = []
            for row in ventas_rows:
                venta = {
                    'id_venta': row[0],
                    'fecha_venta': row[1].strftime('%Y-%m-%d %H:%M') if row[1] else None,
                    'total_venta': row[2],
                    'estado': row[3],
                    'saldo': row[4],
                    'usuario': row[5]
                }
                
                # Obtener detalles de la venta
                cursor.execute("""
                    SELECT p.nombre AS producto, dv.cantidad, 
                        p.precio, (dv.cantidad * p.precio) AS subtotal
                    FROM detalle_ventas dv
                    JOIN productos p ON dv.id_productos = p.id
                    WHERE dv.id_ventas = %s
                """, (row[0],))
                
                detalles_rows = cursor.fetchall()
                detalles = []
                for detalle_row in detalles_rows:
                    detalles.append({
                        'producto': detalle_row[0],
                        'cantidad': detalle_row[1],
                        'precio': HistorialModel.formato_peso_colombiano(detalle_row[2]),
                        'subtotal': HistorialModel.formato_peso_colombiano(detalle_row[3])
                    })
                
                venta['detalles'] = detalles
                venta['total_venta'] = HistorialModel.formato_peso_colombiano(venta['total_venta'])
                venta['saldo'] = HistorialModel.formato_peso_colombiano(venta['saldo'])
                formatted_ventas.append(venta)
            
            return formatted_ventas
        finally:
            if cursor:
                cursor.close()
            if 'connection' in locals():
                connection_pool.putconn(connection)
