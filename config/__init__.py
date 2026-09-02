try:
    import pymysql
except ImportError:
    pymysql = None

if pymysql is not None:
    pymysql.install_as_MySQLdb()
    # Django 6.0 exige mysqlclient >= 2.2.1; PyMySQL usa su propio esquema de
    # versionado (1.x). Forzamos la version para pasar la validacion de Django.
    pymysql.version_info = (2, 2, 1, "final", 0)
    pymysql.__version__ = "2.2.1"
