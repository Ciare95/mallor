from app.db import connection_pool as db
import decimal

class IngredienteProducto:
    def __init__(self, id, producto_id, ingrediente_id, unidad_medida, cantidad_ing, cantidad_factura, costo_factura=None, costo_unitario=None, unidad_cantidad=None, cantidad_original=None, unidad_original=None, costo_ing_por_producto=None, costo_empaque=None):
        self.id = id
        self.producto_id = producto_id
        self.ingrediente_id = ingrediente_id
        self.costo_unitario = costo_unitario
        self.unidad_cantidad = unidad_cantidad
        self.cantidad_original = cantidad_original
        self.unidad_original = unidad_original
        self.costo_factura = costo_factura
        self.costo_ing_por_producto = costo_ing_por_producto
        self.unidad_medida = unidad_medida
        self.cantidad_ing = cantidad_ing
        self.cantidad_factura = cantidad_factura
        self.costo_empaque = costo_empaque
        


    @staticmethod
    def obtener_por_producto(producto_id):
        # Obtener todos los ingredientes asociados a un producto
        query = """
        SELECT * FROM ingredientes_producto
        WHERE producto_id = %s
        """
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (producto_id,))
            columns = [desc[0] for desc in cursor.description]
            resultados = [dict(zip(columns, row)) for row in cursor.fetchall()]
        connection.close()
        return [IngredienteProducto(**r) for r in resultados]

    @staticmethod
    def asignar_ingrediente(producto_id, ingrediente_id, cantidad_por_unidad, costo_unitario, unidad_costo):
        query = """
        INSERT INTO ingredientes_producto 
            (producto_id, ingrediente_id, cantidad_por_unidad, costo_unitario, unidad_costo)
        VALUES 
            (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            cantidad_por_unidad = VALUES(cantidad_por_unidad),
            costo_unitario = VALUES(costo_unitario),
            unidad_costo = VALUES(unidad_costo)
        """
        
        connection = db.getconn()
        try:
            with connection.cursor() as cursor:
                cursor.execute(query, (
                    producto_id,
                    ingrediente_id,
                    cantidad_por_unidad,
                    costo_unitario,
                    unidad_costo
                ))
            connection.commit()
        except Exception as e:
            print(f"Error al asignar ingrediente: {e}")
            raise
        finally:
            connection.close()

    @staticmethod
    def actualizar_cantidad(producto_id, ingrediente_id, cantidad_por_unidad):
        # Actualizar la cantidad de un ingrediente en un producto
        query = """
        UPDATE ingredientes_producto
        SET cantidad_por_unidad = %s
        WHERE producto_id = %s AND ingrediente_id = %s
        """
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (cantidad_por_unidad, producto_id, ingrediente_id))
            connection.commit()
        connection.close()

    @staticmethod
    def eliminar_ingrediente(producto_id, ingrediente_id):
        # Eliminar an ingrediente from a product
        query = """
        DELETE FROM ingredientes_producto
        WHERE producto_id = %s AND ingrediente_id = %s
        """
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (producto_id, ingrediente_id))
            connection.commit()
        connection.close()


    @staticmethod
    def actualizar(ingrediente_id, costo_factura, unidad_medida, cantidad_ing, cantidad_factura, costo_ing_por_producto, costo_empaque):
        query = """
        UPDATE ingredientes_producto
        SET 
            costo_factura = %s,
            unidad_medida = %s,
            cantidad_ing = %s,
            cantidad_factura = %s,
            costo_ing_por_producto = %s,
            costo_empaque = %s
        WHERE ingrediente_id = %s
        """
        
        # Convertir los valores string a los tipos correctos
        try:
            costo_factura = decimal.Decimal(costo_factura)
            cantidad_ing = decimal.Decimal(cantidad_ing) if cantidad_ing else None
            costo_ing_por_producto = decimal.Decimal(costo_ing_por_producto)
            ingrediente_id = int(ingrediente_id)
            costo_empaque = decimal.Decimal(costo_empaque)
        except (decimal.InvalidOperation, ValueError) as e:
            raise ValueError(f"Error en la conversión de tipos: {str(e)}")

        connection = db.getconn()
        try:
            with connection.cursor() as cursor:
                cursor.execute(query, (
                    costo_factura,
                    unidad_medida,
                    cantidad_ing,
                    cantidad_factura,
                    costo_ing_por_producto,
                    costo_empaque,
                    ingrediente_id
                ))
                
                if cursor.rowcount == 0:
                    raise Exception("No se encontró el registro para actualizar")
                    
                connection.commit()
        except Exception as e:
            connection.rollback()
            print(f"Error al actualizar ingrediente: {e}")
            raise
        finally:
            connection.close()
