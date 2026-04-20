from app.db import connection_pool


class Producto:
    def __init__(self, id=None, nombre=None, id_categorias=None, precio=None, cantidad=None, precio_compra=None, ganancia_neta=None, rentabilidad=None, es_servicio=False):
        self.id = id
        self.nombre = nombre
        self.id_categorias = id_categorias
        self.precio = precio
        self.precio_compra = precio_compra
        self.cantidad = cantidad
        self.ganancia_neta = ganancia_neta
        self.rentabilidad = rentabilidad
        self.es_servicio = es_servicio

        
    def formato_peso_colombiano(valor):
        if valor is None:
            return "0"
        return f"{'{:,.0f}'.format(float(valor)).replace(',', '.')}"

    def crear_producto(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = """INSERT INTO productos 
                    (nombre, id_categoria, stock, precio, precio_compra, es_servicio) 
                    VALUES (%s, %s, %s, %s, %s, %s)"""
            valores = (self.nombre, self.id_categorias, 
                      0 if not self.es_servicio and self.cantidad is None else (None if self.es_servicio else self.cantidad),
                      self.precio, self.precio_compra, self.es_servicio)
            
            # Debug: imprimir los valores que se van a insertar
            print(f"DEBUG - Valores a insertar: {valores}")
            
            cursor.execute(sql, valores)
            conexion.commit()
            print("DEBUG - Producto creado exitosamente")
            return True
        except Exception as e:
            print(f"ERROR al crear el producto: {e}")
            print(f"ERROR - Tipo de excepción: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)

    def actualizar_producto(self):
        if not self.id:
            return False
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = """UPDATE productos 
                     SET nombre = %s, id_categoria = %s, stock = %s, 
                         precio = %s, precio_compra = %s, es_servicio = %s 
                     WHERE id = %s"""
            cursor.execute(sql, (
                self.nombre, 
                self.id_categorias, 
                None if self.es_servicio else self.cantidad,
                self.precio, 
                self.precio_compra,
                self.es_servicio,
                self.id
            ))
            conexion.commit()
            return True
        except Exception as e:
            print(f"Error al actualizar el producto: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
            

    def obtener_por_id(self, id):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "SELECT id, nombre, id_categoria, stock, precio, precio_compra FROM productos WHERE id = %s"
            cursor.execute(sql, (id,))
            resultado = cursor.fetchone()
            if resultado:
                self.id = resultado[0]
                self.nombre = resultado[1]
                self.id_categorias = resultado[2]
                self.cantidad = resultado[3]
                self.precio = resultado[4]
                self.precio_compra = resultado[5]
                return self
            return None
        except Exception as e:
            print(f"Error al obtener el producto: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)

    def obtener_todos(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = """
                SELECT 
                    p.id,
                    p.nombre AS producto_nombre,
                    COALESCE(c.nombre, 'Sin categoría') AS categoria_nombre,
                    p.stock,
                    p.precio,
                    p.precio_compra,
                    p.id_categoria AS categoria_id,
                    (p.precio - p.precio_compra) AS ganancia_neta,
                    CASE 
                        WHEN p.precio > 0 THEN ((p.precio - p.precio_compra) * 100 / p.precio)
                        ELSE 0
                    END AS rentabilidad
                FROM 
                    productos p
                LEFT JOIN 
                    categorias c ON p.id_categoria = c.id
            """
            cursor.execute(sql)
            resultados = cursor.fetchall()
            
            def formato_peso_colombiano(valor):
                if valor is None:
                    return "0"
                return f"{'{:,.0f}'.format(float(valor)).replace(',', '.')}"
            
            productos = []
            
            # Si no hay resultados, retorna lista vacía y rentabilidad cero
            if not resultados:
                return productos, "0.00%"
            
            for resultado in resultados:
                producto = {
                    'id': resultado[0],
                    'producto_nombre': resultado[1],
                    'categoria_nombre': resultado[2],
                    'stock': resultado[3],
                    'precio': formato_peso_colombiano(resultado[4]),
                    'precio_compra': formato_peso_colombiano(resultado[5]),
                    'categoria_id': resultado[6],
                    'ganancia_neta': formato_peso_colombiano(resultado[7]),
                    'rentabilidad': f"{resultado[8]:.2f}%"  # Formateo a porcentaje
                }
                productos.append(producto)
                
            total_rentabilidad = sum(float(producto['rentabilidad'].rstrip('%')) for producto in productos) / len(productos)
            total_rentabilidad = f"{total_rentabilidad:.2f}%"
            
            return productos, total_rentabilidad
        
        except Exception as e:
            print(f"Error al obtener productos: {e}")
            return [], "0.00%"  # Retorna lista vacía y rentabilidad cero en caso de error
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)

            

    def eliminar_producto(self):
        if not self.id:
            return False
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "DELETE FROM productos WHERE id = %s"
            cursor.execute(sql, (self.id,))
            conexion.commit()
            self.id = None
            return True
        except Exception as e:
            print(f"Error al eliminar el producto: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
            
            
    def buscar_por_nombre_o_id(self, query):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = """
                SELECT 
                    id, 
                    nombre, 
                    stock, 
                    precio,
                    precio_compra
                FROM 
                    productos 
                WHERE 
                    nombre LIKE %s OR CAST(id AS TEXT) LIKE %s
            """
            cursor.execute(sql, (f"%{query}%", f"%{query}%"))
            resultados = cursor.fetchall()
            
            productos = []
            for resultado in resultados:
                productos.append({
                    'id': resultado[0],
                    'nombre': resultado[1],
                    'stock': resultado[2],
                    'precio': resultado[3],
                    'precio_compra': resultado[4]
                })
            return productos
        except Exception as e:
            print(f"Error al buscar productos: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)


    def obtener_por_categoria(self, categoria_id):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = """
                SELECT 
                    p.id,
                    p.nombre AS producto_nombre,
                    p.stock,
                    p.precio,
                    p.precio_compra
                FROM 
                    productos p
                WHERE 
                    p.id_categoria = %s
            """
            cursor.execute(sql, (categoria_id,))
            resultados = cursor.fetchall()

            productos = []
            for resultado in resultados:
                producto = {
                    'id': resultado[0],
                    'producto_nombre': resultado[1],
                    'stock': resultado[2],
                    'precio': Producto.formato_peso_colombiano(resultado[3]),
                    'precio_compra': Producto.formato_peso_colombiano(resultado[4])
                }
                productos.append(producto)

            return productos
        except Exception as e:
            print(f"Error al obtener productos por categoría: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
