
class Negocio:
    def __init__(self, id=None, nombre=None, nit=None, direccion=None, telefono=None, email=None):
        self.id = id
        self.nombre = nombre
        self.nit = nit
        self.direccion = direccion
        self.telefono = telefono
        self.email = email

    @staticmethod
    def crear(conexion, negocio):
        cursor = conexion.cursor()
        sql = """
            INSERT INTO negocios (nombre, nit, direccion, telefono, email)
            VALUES (%s, %s, %s, %s, %s)
        """
        valores = (negocio.nombre, negocio.nit, negocio.direccion, negocio.telefono, negocio.email)
        cursor.execute(sql, valores)
        conexion.commit()
        negocio.id = cursor.lastrowid
        cursor.close()
        return negocio

    @staticmethod
    def obtener_por_id(conexion, id):
        cursor = conexion.cursor()
        cursor.execute("SELECT * FROM negocios WHERE id = %s", (id,))
        columns = [desc[0] for desc in cursor.description]
        row = cursor.fetchone()
        negocio_data = dict(zip(columns, row)) if row else None
        cursor.close()
        if negocio_data:
            return Negocio(**negocio_data)
        return None

    @staticmethod
    def obtener_todos(conexion):
        cursor = conexion.cursor()
        cursor.execute("SELECT * FROM negocios")
        columns = [desc[0] for desc in cursor.description]
        negocios = [Negocio(**dict(zip(columns, row))) for row in cursor.fetchall()]
        cursor.close()
        return negocios

    @staticmethod
    def actualizar(conexion, negocio):
        cursor = conexion.cursor()
        sql = """
            UPDATE negocios 
            SET nombre = %s, nit = %s, direccion = %s, telefono = %s, email = %s
            WHERE id = %s
        """
        valores = (negocio.nombre, negocio.nit, negocio.direccion, 
                  negocio.telefono, negocio.email, negocio.id)
        cursor.execute(sql, valores)
        conexion.commit()
        cursor.close()
        return negocio

    @staticmethod
    def eliminar(conexion, id):
        cursor = conexion.cursor()
        cursor.execute("DELETE FROM negocios WHERE id = %s", (id,))
        conexion.commit()
        cursor.close()
