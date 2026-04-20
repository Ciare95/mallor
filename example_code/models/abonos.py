from app.db import connection_pool
from psycopg2.extras import DictCursor


class AbonoModel:
    @staticmethod
    def obtener_venta(id_venta):
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor(cursor_factory=DictCursor)
            cursor.execute("SELECT saldo, estado FROM ventas WHERE id = %s", (id_venta,))
            return cursor.fetchone()
        finally:
            if cursor:
                cursor.close()
            connection_pool.putconn(connection)

    @staticmethod
    def registrar_abono(id_venta, monto):
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor()
            
            # Verificar saldo antes de registrar el abono
            saldo = AbonoModel.verificar_saldo(id_venta)
            if monto > saldo:
                raise ValueError("El monto del abono no puede ser mayor al saldo pendiente.")

            # Registrar el abono
            cursor.execute(
                "INSERT INTO abonos (id_venta, monto, fecha_abono) VALUES (%s, %s, NOW())",
                (id_venta, monto),
            )
            connection.commit()
        finally:
            if cursor:
                cursor.close()
            connection_pool.putconn(connection)

    @staticmethod
    def actualizar_saldo(id_venta, nuevo_saldo, estado):
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor()
            if nuevo_saldo == 0:
                estado = "cancelada"  # O cualquier otro estado que prefieras
            cursor.execute(
                "UPDATE ventas SET saldo = %s, estado = %s WHERE id = %s",
                (nuevo_saldo, estado, id_venta),
            )
            connection.commit()
        finally:
            if cursor:
                cursor.close()
            connection_pool.putconn(connection)

    @staticmethod
    def verificar_saldo(id_venta):
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT saldo FROM ventas WHERE id = %s", (id_venta,))
            result = cursor.fetchone()
            if result:
                return result[0]
            else:
                raise ValueError(f"Venta con ID {id_venta} no encontrada.")
        finally:
            if cursor:
                cursor.close()
            connection_pool.putconn(connection)

    @staticmethod
    def obtener_abonos(id_venta):
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor(cursor_factory=DictCursor)
            cursor.execute("SELECT id, monto, fecha_abono FROM abonos WHERE id_venta = %s", (id_venta,))
            return cursor.fetchall()
        finally:
            if cursor:
                cursor.close()
            connection_pool.putconn(connection)
