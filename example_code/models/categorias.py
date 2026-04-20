from app.db import connection_pool


class Categoria:
    def __init__(self, id=None, nombre=None):
        self.id = id
        self.nombre = nombre
        
    def obtener_categorias(self):
        conexion = connection_pool.getconn()
        cursor = None
        categorias = []
        
        try:
            cursor = conexion.cursor()
            sql = "SELECT id, nombre FROM categorias"
            cursor.execute(sql)
            resultados = cursor.fetchall()
            for fila in resultados:
                categoria = Categoria(id=fila[0], nombre=fila[1])
                categorias.append(categoria)
        except Exception as e:
            print(f"Error al obtener las categorías: {e}")
        finally:
            if cursor:
                cursor.close()
            if conexion:
                connection_pool.putconn(conexion)
            
        return categorias

    def obtener_por_id(self, id):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "SELECT * FROM categorias WHERE id = %s"
            cursor.execute(sql, (id,))
            categoria = cursor.fetchone()
            if categoria:
                self.id = categoria[0]
                self.nombre = categoria[1]
                return self
            return None
        except Exception as e:
            print(f"Error al obtener la categoría: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
            if conexion:
                connection_pool.putconn(conexion)
        
    def crear_categoria(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "INSERT INTO categorias (nombre) VALUES (%s)"
            cursor.execute(sql, (self.nombre,))
            conexion.commit()
            print(f"Categoria insertada con ID: {cursor.lastrowid}")  # Depuración
            self.id = cursor.lastrowid
            return True
        except Exception as e:
            print(f"Error al guardar la categoría: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if conexion:
                connection_pool.putconn(conexion)

    
    def editar_categoria(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "UPDATE categorias SET nombre = %s WHERE id = %s"
            cursor.execute(sql, (self.nombre, self.id))
            conexion.commit()
            return True
        except Exception as e:
            print(f"Error al actualizar la categoría: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if conexion:
                connection_pool.putconn(conexion)
            
    def eliminar_categoria(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "DELETE FROM categorias WHERE id = %s"
            cursor.execute(sql, (self.id,))
            conexion.commit()
            return True
        except Exception as e:
            print(f"Error al eliminar la categoría: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if conexion:
                connection_pool.putconn(conexion)
