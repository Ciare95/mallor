from app.db import connection_pool as db

class InventarioIngrediente:
    def __init__(self, id, ingrediente_id, cantidad):
        self.id = id
        self.ingrediente_id = ingrediente_id
        self.cantidad = cantidad

    @staticmethod
    def obtener_todos():
        query = "SELECT * FROM inventario_ingredientes"
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            resultados = [dict(zip(columns, row)) for row in cursor.fetchall()]
        connection.close()
        return [InventarioIngrediente(**r) for r in resultados]

    @staticmethod
    def actualizar_cantidad(ingrediente_id, cantidad):
        query = """
        UPDATE inventario_ingredientes
        SET cantidad = %s
        WHERE ingrediente_id = %s
        """
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (cantidad, ingrediente_id))
            connection.commit()
        connection.close()
