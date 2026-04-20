from app.db import connection_pool as db

class IngredienteFactura:
    def __init__(self, id, nombre, cantidad, costo_unitario, id_factura, medida_ingrediente, iva=None, trasporte=None, costo_final=None):
        self.id = id
        self.nombre = nombre
        self.cantidad = cantidad
        self.costo_unitario = costo_unitario
        self.id_factura = id_factura
        self.medida_ingrediente = medida_ingrediente
        self.iva = iva,
        self.transporte = trasporte, 
        self.costo_final = costo_final
        
        
    @staticmethod
    def obtener_todos():
        query = "SELECT * FROM ingredientes_factura"
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            resultados = [dict(zip(columns, row)) for row in cursor.fetchall()]
        connection.close()
        return [IngredienteFactura(**r) for r in resultados]
    
    @staticmethod
    def obtener_por_id(id_factura):
        connection = db.getconn()
        cursor = connection.cursor()
        try:
            query = """
            SELECT 
                f.id, 
                f.cantidad, 
                f.precio_unitario, 
                f.subtotal, 
                f.medida_ingrediente, 
                f.iva,
                f.transporte,
                f.costo_final,
                i.nombre AS nombre_ingrediente
            FROM ingredientes_factura f
            JOIN ingredientes i ON f.id_ingrediente = i.id
            WHERE f.id_factura = %s;
            """
            cursor.execute(query, (id_factura,))
            columns = [desc[0] for desc in cursor.description]
            ingredientes = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return ingredientes
            
        except Exception as e:
            print(f'Error {e}')
        

    @staticmethod
    def crear(nombre, cantidad, costo_unitario, id_factura):
        query = """
        INSERT INTO ingredientes_factura (nombre, cantidad, costo_unitario, id_factura)
        VALUES (%s, %s, %s, %s)
        """
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (nombre, cantidad, costo_unitario, id_factura,))
            connection.commit()
        connection.close()
