from app.db import connection_pool

class Cliente:
    def __init__(self, id=None, nombre=None, apellido=None, documento=None):
        self.id = id
        self.nombre = nombre
        self.apellido = apellido
        self.documento = documento
        
        
        
    def obtener_por_id(self, id):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "SELECT * FROM clientes WHERE id = %s"
            cursor.execute(sql, (id,))
            resultado = cursor.fetchone()
            if resultado:
                self.id = resultado[0]
                self.nombre = resultado[1]
                self.apellido = resultado[2]
                self.documento = resultado[3]
                return self
            return None
        except Exception as e:
            print(f"Error al obtener el cliente: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
            
            
    def crear_cliente(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            # Validar existencia del documento antes de insertar
            sql_verificar = "SELECT id FROM clientes WHERE documento = %s"
            cursor.execute(sql_verificar, (self.documento,))
            if cursor.fetchone():
                print("Error: El documento ya existe.")
                return False

            # Insertar cliente
            sql_insertar = "INSERT INTO clientes (nombre, apellido, documento) VALUES (%s, %s, %s)"
            cursor.execute(sql_insertar, (self.nombre, self.apellido, self.documento))
            conexion.commit()
            self.id = cursor.lastrowid
            return True
        except Exception as e:
            print(f"Error al guardar el cliente: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)

                  
    def obtener_clientes(self):
        conexion = connection_pool.getconn()
        cursor = None
        clientes = []
        
        try:
            cursor = conexion.cursor()
            sql = "SELECT id, nombre, apellido, documento FROM clientes"
            cursor.execute(sql)
            resultados = cursor.fetchall()
            for fila in resultados:
                cliente = Cliente(
                    id=fila[0], 
                    nombre=fila[1] if fila[1] is not None else "", 
                    apellido=fila[2] if fila[2] is not None else "", 
                    documento=fila[3] if fila[3] is not None else ""
                )
                clientes.append(cliente)

        except Exception as e:
            print(f"Error al obtener los clientes: {e}")
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
            
        return clientes
    
    def editar_cliente(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            sql = "UPDATE clientes SET nombre = %s, apellido = %s, documento = %s WHERE id = %s"
            cursor.execute(sql, (self.nombre, self.apellido, self.documento, self.id))
            conexion.commit()
            return True
        except Exception as e:
            print(f"Error al editar el cliente: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
            
    
    def eliminar_cliente(self):
        conexion = connection_pool.getconn()
        cursor = None
        try:
            cursor = conexion.cursor()
            # Transferir ventas al usuario default (ID 1)
            sql_ventas = "UPDATE ventas SET id_cliente = 1 WHERE id_cliente = %s"
            cursor.execute(sql_ventas, (self.id,))
            
            # Eliminar cliente
            sql_cliente = "DELETE FROM clientes WHERE id = %s"
            cursor.execute(sql_cliente, (self.id,))
            
            conexion.commit()
            return True
        except Exception as e:
            print(f"Error al eliminar el cliente: {e}")
            conexion.rollback()
            return False
        finally:
            if cursor:
                cursor.close()
            if 'conexion' in locals():
                connection_pool.putconn(conexion)
