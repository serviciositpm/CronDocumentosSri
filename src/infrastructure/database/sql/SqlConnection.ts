import sql from 'mssql';
import config from '../../../config/config';

class SqlConnection {
  private static instance: sql.ConnectionPool;

  static async getPool(): Promise<sql.ConnectionPool> {
    if (!SqlConnection.instance) {
      SqlConnection.instance = await sql.connect(config.sql);
      console.log('🤝 Conectado a Sql Server');
    }
    return SqlConnection.instance;
  }

  static async close(): Promise<void> {
    if (SqlConnection.instance) {
      console.log('❌ Cerrando conexión a Sql Server');
      await SqlConnection.instance.close();
    }
  }
}

export default SqlConnection;