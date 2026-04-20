from app.db import connection_pool
from datetime import datetime

class Venta:
    def __init__(self, id=None, total=None, id_cliente=None, estado='pendiente', saldo=None):
        self.id = id
        self.id_cliente = id_cliente
        self.total = total
        self.estado = estado
        self.saldo = saldo
            

    def crear_venta(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = """
                INSERT INTO ventas (fecha_venta, total_venta, id_cliente, id_usuarios, estado, saldo)
                VALUES (NOW(), %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (self.total, self.id_cliente, self.id_usuario, self.estado, self.saldo))
            conexion.commit()
            self.id = cursor.lastrowid
        except Exception as e:
            print(f"Error al crear la venta: {e}")
            raise e
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)


    @staticmethod
    def obtener_ventas():
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = """
                SELECT 
                    v.id, 
                    v.fecha_venta, 
                    v.total_venta, 
                    v.estado, 
                    v.saldo,
                    c.nombre AS cliente, 
                    p.nombre AS producto, 
                    dv.cantidad, 
                    p.precio,
                    u.nombre AS usuario
                FROM ventas v
                JOIN detalle_ventas dv ON v.id = dv.id_ventas
                JOIN productos p ON dv.id_productos = p.id
                LEFT JOIN clientes c ON v.id_cliente = c.id
                LEFT JOIN usuarios u ON v.id_usuarios = u.id
                ORDER BY v.fecha_venta DESC;
            """
            cursor.execute(sql)
            resultados = cursor.fetchall()

            ventas = []
            for row in resultados:
                fecha_venta = row[1]
                if isinstance(fecha_venta, datetime):
                    fecha_formateada = fecha_venta.strftime("%Y-%m-%d %H:%M:%S")
                else:
                    fecha_formateada = str(fecha_venta)

                venta = {
                    'id': row[0],
                    'fecha': fecha_formateada,
                    'total': row[2],
                    'estado': row[3],  # Estado de la venta
                    'saldo': row[4],    # Agregar saldo aquí
                    'cliente': row[5],  # Nombre del cliente
                    'detalles': [{
                        'producto': row[6],
                        'cantidad': row[7],
                        'precio': row[8]
                    }]
                }

                # Agrupar los detalles si la venta ya existe en la lista
                if len(ventas) > 0 and ventas[-1]['id'] == venta['id']:
                    ventas[-1]['detalles'].append({
                        'producto': row[6],
                        'cantidad': row[7],
                        'precio': row[8]
                    })
                else:
                    ventas.append(venta)

            return ventas


        except Exception as e:
            print(f"Error al obtener ventas: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)

            
    
    @staticmethod
    def agregar_abono(id_venta, monto):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "INSERT INTO abonos (id_venta, monto) VALUES (%s, %s)"
            cursor.execute(sql, (id_venta, monto))
            conexion.commit()
        except Exception as e:
            print(f"Error al agregar el abono: {e}")
            raise e
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)

    @staticmethod
    def obtener_abonos(id_venta):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "SELECT id, fecha_abono, monto FROM abonos WHERE id_venta = %s"
            cursor.execute(sql, (id_venta,))
            return cursor.fetchall()
        except Exception as e:
            print(f"Error al obtener abonos: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
        
    
    @staticmethod
    def procesar_abono(id_cliente, monto):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            
            # Obtener facturas pendientes
            sql_pendientes = """
                SELECT id, saldo
                FROM ventas
                WHERE id_cliente = %s AND estado = 'pendiente'
                ORDER BY fecha_venta ASC
            """
            cursor.execute(sql_pendientes, (id_cliente,))
            columns = [desc[0] for desc in cursor.description]
            facturas_pendientes = [dict(zip(columns, row)) for row in cursor.fetchall()]

            for factura in facturas_pendientes:
                if monto <= 0:
                    break

                saldo_pendiente = factura['saldo']
                abono_actual = 0

                if monto >= saldo_pendiente:
                    # Si el abono cubre el saldo de la factura, cerrar la factura
                    abono_actual = saldo_pendiente
                    sql_actualizar = """
                        UPDATE ventas
                        SET estado = 'cerrada', saldo = 0
                        WHERE id = %s
                    """
                    cursor.execute(sql_actualizar, (factura['id'],))
                    monto -= saldo_pendiente
                else:
                    # Si el abono es parcial, reducir el saldo
                    abono_actual = monto
                    sql_actualizar = """
                        UPDATE ventas
                        SET saldo = saldo - %s
                        WHERE id = %s
                    """
                    cursor.execute(sql_actualizar, (monto, factura['id']))
                    monto = 0

                # Registrar el abono en la tabla `abonos`
                sql_abono = "INSERT INTO abonos (id_venta, monto, fecha_abono) VALUES (%s, %s, CURRENT_TIMESTAMP)"
                cursor.execute(sql_abono, (factura['id'], abono_actual))

            conexion.commit()

        except Exception as e:
            print(f"Error al procesar abono: {e}")
            raise e
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
            
            
    @staticmethod
    def obtener_ventas_por_cliente(cliente_id):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = """
                SELECT 
                    v.id, 
                    v.fecha_venta, 
                    v.total_venta, 
                    v.estado, 
                    v.saldo,
                    c.nombre AS cliente, 
                    p.nombre AS producto, 
                    dv.cantidad, 
                    p.precio,
                    u.nombre AS usuario
                FROM ventas v
                JOIN detalle_ventas dv ON v.id = dv.id_ventas
                JOIN productos p ON dv.id_productos = p.id
                LEFT JOIN clientes c ON v.id_cliente = c.id
                LEFT JOIN usuarios u ON v.id_usuarios = u.id
                WHERE v.id_cliente = %s
                ORDER BY v.fecha_venta DESC
            """
            cursor.execute(sql, (cliente_id,))
            resultados = cursor.fetchall()
            

            ventas = []
            for row in resultados:
                fecha_venta = row[1]
                fecha_formateada = fecha_venta.strftime("%Y-%m-%d %H:%M:%S") if isinstance(fecha_venta, datetime) else str(fecha_venta)

                venta = {
                    'id': row[0],
                    'fecha': fecha_formateada,
                    'total': row[2],
                    'estado': row[3],
                    'cliente': row[4],
                    'detalles': [{
                        'producto': row[5],
                        'cantidad': row[6],
                        'precio': row[7]
                    }]
                }

                if len(ventas) > 0 and ventas[-1]['id'] == venta['id']:
                    ventas[-1]['detalles'].append({
                        'producto': row[5],
                        'cantidad': row[6],
                        'precio': row[7]
                    })
                else:
                    ventas.append(venta)

            return ventas

        except Exception as e:
            print(f"Error al obtener ventas por cliente: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
