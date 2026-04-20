from app.db import connection_pool as db

class ProductoFabricado:
    def __init__(self, id, nombre, unidad_medida, costo_total, precio_venta, cantidad_producida, ganancia_neta, porcentaje_rentabilidad):
        self.id = id
        self.nombre = nombre
        self.unidad_medida = unidad_medida
        self.costo_total = costo_total
        self.precio_venta = precio_venta
        self.cantidad_producida = cantidad_producida
        self.ganancia_neta = ganancia_neta
        self.porcentaje_rentabilidad = porcentaje_rentabilidad

    @staticmethod
    def formato_peso_colombiano(valor):
        if valor is None:
            return "0"
        return f"{'{:,.0f}'.format(float(valor)).replace(',', '.')}"

    def precio_venta_formateado(self):
        return self.formato_peso_colombiano(self.precio_venta)

    def costo_total_formateado(self):
        return self.formato_peso_colombiano(self.costo_total)
    
    def ganancia_neta_formateado(self):
        return self.formato_peso_colombiano(self.ganancia_neta)
    

    @staticmethod
    def obtener_todos():
        query = "SELECT * FROM productos_fabricados"
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            resultados = [dict(zip(columns, row)) for row in cursor.fetchall()]
        db.putconn(connection)

        # Calcular ganancia neta y porcentaje de rentabilidad
        productos = []
        for r in resultados:
            ganancia_neta = (r['precio_venta'] - r['costo_total']) if r['costo_total'] is not None else 0
            porcentaje_rentabilidad = (ganancia_neta * 100 / r['precio_venta']) if r['precio_venta'] > 0 else 0

            producto = ProductoFabricado(
                id=r['id'],
                nombre=r['nombre'],
                unidad_medida=r['unidad_medida'],
                costo_total=r['costo_total'],
                precio_venta=r['precio_venta'],
                cantidad_producida=r['cantidad_producida'],
                ganancia_neta=ganancia_neta,
                porcentaje_rentabilidad=porcentaje_rentabilidad
            )
            productos.append(producto)

        return productos


    @staticmethod
    def obtener_por_id(producto_id):
        query = "SELECT * FROM productos_fabricados WHERE id = %s"
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (producto_id,))
            columns = [desc[0] for desc in cursor.description]
            row = cursor.fetchone()
            resultado = dict(zip(columns, row)) if row else None
        db.putconn(connection)

        if resultado:
            # Calcular ganancia neta y porcentaje de rentabilidad
            ganancia_neta = (resultado['precio_venta'] - resultado['costo_total']) if resultado['costo_total'] is not None else 0
            porcentaje_rentabilidad = (ganancia_neta * 100 / resultado['precio_venta']) if resultado['precio_venta'] > 0 else 0

            return ProductoFabricado(
                id=resultado['id'],
                nombre=resultado['nombre'],
                unidad_medida=resultado['unidad_medida'],
                costo_total=resultado['costo_total'],
                precio_venta=resultado['precio_venta'],
                cantidad_producida=resultado['cantidad_producida'],
                ganancia_neta=ganancia_neta,
                porcentaje_rentabilidad=porcentaje_rentabilidad
            )
        return None



    @staticmethod
    def crear(nombre, unidad_medida, costo_total, precio_venta, cantidad_producida):
        query = """
            INSERT INTO productos_fabricados (nombre, unidad_medida, costo_total, precio_venta, cantidad_producida)
            VALUES (%s, %s, %s, %s, %s)
        """
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (nombre, unidad_medida, costo_total, precio_venta, cantidad_producida))
            connection.commit()
        db.putconn(connection)


    @staticmethod
    def actualizar(producto_id, nombre, unidad_medida, cantidad_producida, precio_venta):
        query = """
        UPDATE productos_fabricados
        SET nombre = %s, unidad_medida = %s, cantidad_producida = %s, precio_venta = %s
        WHERE id = %s
        """
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (nombre, unidad_medida, cantidad_producida, precio_venta, producto_id))
            connection.commit()
        db.putconn(connection)

    @staticmethod
    def eliminar(producto_id):
        query = "DELETE FROM productos_fabricados WHERE id = %s"
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (producto_id,))
            connection.commit()
        db.putconn(connection)

    
    def obtener_ingredientes(self):
        query = """
            SELECT 
                i.nombre,
                ip.costo_factura,
                ip.costo_ing_por_producto,
                ip.unidad_medida,
                ip.cantidad_ing,
                ip.cantidad_factura,
                i.id as ingrediente_id,
                ip.costo_empaque
            FROM ingredientes_producto ip
            JOIN ingredientes i ON ip.ingrediente_id = i.id
            WHERE ip.producto_id = %s
        """
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (self.id,))
            columns = [desc[0] for desc in cursor.description]
            resultados = [dict(zip(columns, row)) for row in cursor.fetchall()]
        db.putconn(connection)
        
        
        return resultados
    
    
    @staticmethod
    def actualizar_costo_total(producto_id, costo_total):
        query = "UPDATE productos_fabricados SET costo_total = %s WHERE id = %s"
        connection = db.getconn()
        with connection.cursor() as cursor:
            cursor.execute(query, (costo_total, producto_id))
            connection.commit()
        db.putconn(connection)
