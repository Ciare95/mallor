from flask_login import UserMixin
from app.db import connection_pool

class Usuario(UserMixin):
    def __init__(self, id=None, nombre=None, contrasena=None, id_rol=None):
        self.id = id
        self.nombre = nombre
        self.contrasena = contrasena
        self.id_rol = id_rol
        self._authenticated = True

    @property
    def is_authenticated(self):
        return self._authenticated

    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def get_id(self):
        return str(self.id)

    @staticmethod
    def obtener_por_nombre(nombre):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "SELECT * FROM usuarios WHERE nombre = %s"
            cursor.execute(sql, (nombre,))
            resultado = cursor.fetchone()
            if resultado:
                usuario = Usuario(
                    id=resultado[0],
                    nombre=resultado[1],
                    contrasena=resultado[2],
                    id_rol=resultado[3]
                )
                return usuario
            return None
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
            sql = "SELECT * FROM usuarios WHERE id = %s"
            cursor.execute(sql, (id,))
            resultado = cursor.fetchone()
            if resultado:
                self.id = resultado[0]
                self.nombre = resultado[1]
                self.password = resultado[2]
                self.id_rol = resultado[3]
                return self
            return None
        except Exception as e:
            print(f"Error al obtener el usuario: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
            
    
    def obtener_usuarios(self):
        conexion = connection_pool.getconn()
        cursor = None
        usuarios = []
        
        try:
            cursor = conexion.cursor()
            sql = """
                SELECT usuarios.id, usuarios.nombre, rol.nombre AS rol
                FROM usuarios
                INNER JOIN rol ON usuarios.id_rol = rol.id
            """
            cursor.execute(sql)
            resultados = cursor.fetchall()
            for fila in resultados:
                usuario = {
                    "id": fila[0],
                    "nombre": fila[1],
                    "rol": fila[2]
                }
                usuarios.append(usuario)
        except Exception as e:
            print(f"Error al obtener los usuarios: {e}")
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
            
        return usuarios

    
            
    def crear_usuario(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "INSERT INTO usuarios (nombre, contrasena, id_rol) VALUES (%s, %s, %s)"
            cursor.execute(sql, (self.nombre, self.contrasena, self.id_rol))  # Cambiado de self.password a self.contrasena
            conexion.commit()
            self.id = cursor.lastrowid
            return True
        except Exception as e:
            print(f"Error al guardar el usuario: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)

            
    
    def actualizar_usuario(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "UPDATE usuarios SET nombre = %s, contrasena = %s, id_rol = %s WHERE id = %s"
            cursor.execute(sql, (self.nombre, self.password, self.id_rol, self.id))
            conexion.commit()
            return True
        except Exception as e:
            print(f"Error al actualizar el usuario: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
            
            
    def eliminar_usuario(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "DELETE FROM usuarios WHERE id = %s"
            cursor.execute(sql, (self.id,))
            conexion.commit()
            self.id = None
            return True
        except Exception as e:
            print(f"Error al eliminar el usuario: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
