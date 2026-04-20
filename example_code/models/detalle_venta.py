from app.db import connection_pool

class DetalleVenta:
    def __init__(self, id=None, id_usuarios=None, id_ventas=None, id_productos=None, id_clientes=None, cantidad=None):
        self.id = id
        self.id_usuarios = id_usuarios
        self.id_ventas = id_ventas
        self.id_productos = id_productos
        self.id_clientes = id_clientes
        self.cantidad = cantidad

    @staticmethod
    def guardar(detalle):
        """Guarda un detalle de venta en la base de datos."""
        connection = connection_pool.getconn()
        cursor = connection.cursor()

        query = """
        INSERT INTO detalle_ventas (id_usuarios, id_ventas, id_productos, id_clientes, cantidad)
        VALUES (%s, %s, %s, %s, %s)
        """
        values = (detalle.id_usuarios, detalle.id_ventas, detalle.id_productos, detalle.id_clientes, detalle.cantidad)

        cursor.execute(query, values)
        connection.commit()
        cursor.close()
        connection_pool.putconn(connection)
