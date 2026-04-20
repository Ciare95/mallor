from app.db import connection_pool

class InformeModel:
    
    @staticmethod
    def formato_peso_colombiano(valor):
        if valor is None:
            return "0"
        return f"{'{:,.0f}'.format(float(valor)).replace(',', '.')}"
    
    @staticmethod
    def obtener_ingresos(where_clause="", parametros=None):
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor()
            
            # Ajustamos el where_clause para la tabla ventas
            where_ventas = where_clause.replace('fecha_registro', 'fecha_venta') if where_clause else ""
            
            query = f"""
                SELECT 
                    COALESCE(SUM(total_venta - saldo), 0) AS total_ingresos
                FROM ventas v
                {where_ventas}
            """
            
            print("Query ingresos:", query % (parametros or {}))
            cursor.execute(query, parametros or {})
            resultado = cursor.fetchone()
            
            total_ingresos = float(resultado[0]) if resultado and resultado[0] else 0.0
            return InformeModel.formato_peso_colombiano(total_ingresos)

        finally:
            if cursor:
                cursor.close()
            if 'connection' in locals():
                connection_pool.putconn(connection)

    @staticmethod
    def obtener_egresos(where_clause="", parametros=None):
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor()
            
            # Ajustamos los where_clause para cada tabla
            where_ventas = where_clause.replace('fecha_registro', 'fecha_venta') if where_clause else ""
            where_facturas = where_clause.replace('fecha_registro', 'fecha_factura') if where_clause else ""
            where_otros = where_clause.replace('fecha_registro', 'fecha') if where_clause else ""
            
            # 1. Egresos de productos vendidos
            query_productos = f"""
                SELECT COALESCE(SUM(dv.cantidad * p.precio_compra), 0) AS egresos_productos
                FROM ventas v
                JOIN detalle_ventas dv ON v.id = dv.id_ventas
                JOIN productos p ON dv.id_productos = p.id
                {where_ventas}
            """
            
            # 2. Egresos de facturas
            query_facturas = f"""
                SELECT COALESCE(SUM(total), 0) AS egresos_facturas
                FROM facturas
                {where_facturas}
            """
            
            # 3. Otros egresos
            query_otros = f"""
                SELECT COALESCE(SUM(valor), 0) AS otros_egresos
                FROM otros_egresos
                {where_otros}
            """
            
            print("Query productos:", query_productos % (parametros or {}))
            cursor.execute(query_productos, parametros or {})
            egresos_productos = float(cursor.fetchone()[0] or 0.0)
            
            print("Query facturas:", query_facturas % (parametros or {}))
            cursor.execute(query_facturas, parametros or {})
            egresos_facturas = float(cursor.fetchone()[0] or 0.0)
            
            print("Query otros:", query_otros % (parametros or {}))
            cursor.execute(query_otros, parametros or {})
            otros_egresos = float(cursor.fetchone()[0] or 0.0)

            # Convertimos todo a float antes de sumar
            total_egresos = egresos_productos + egresos_facturas + otros_egresos
            
            return InformeModel.formato_peso_colombiano(total_egresos)

        finally:
            if cursor:
                cursor.close()
            if 'connection' in locals():
                connection_pool.putconn(connection)

    @staticmethod
    def registrar_otro_egreso(descripcion, valor):
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor()
            query = "INSERT INTO otros_egresos (descripcion, valor) VALUES (%s, %s)"
            cursor.execute(query, (descripcion, valor))
            connection.commit()
        finally:
            if cursor:
                cursor.close()
            if 'connection' in locals():
                connection_pool.putconn(connection)


    @staticmethod
    def listar_otros_egresos():
        connection = connection_pool.getconn()
        cursor = None
        try:
            cursor = connection.cursor()
            query = "SELECT * FROM otros_egresos"
            cursor.execute(query)
            resultados = cursor.fetchall()
            
            # Convertir resultados de tuplas a diccionarios
            formatted_results = []
            column_names = [desc[0] for desc in cursor.description] if cursor.description else []
            
            for row in resultados:
                resultado_dict = {}
                for i, value in enumerate(row):
                    if i < len(column_names):
                        resultado_dict[column_names[i]] = value
                
                # Formatea el valor de cada resultado
                if resultado_dict and resultado_dict.get('valor') is not None:
                    resultado_dict['valor_formato'] = InformeModel.formato_peso_colombiano(resultado_dict['valor'])
                else:
                    resultado_dict['valor_formato'] = InformeModel.formato_peso_colombiano(0.0)
                
                formatted_results.append(resultado_dict)
            
            return formatted_results
            
        finally:
            if cursor:
                cursor.close()
            if 'connection' in locals():
                connection_pool.putconn(connection)
