import { ICredencialSRIRepository } from '../../../domain/repositories/ICredencialSRIRepository';
import { CredencialSRI } from '../../../domain/entities/CredencialSRI';
import SqlConnection from './SqlConnection';

export class CredencialSRIRepositorySQL implements ICredencialSRIRepository {
  async obtenerCredenciales(): Promise<CredencialSRI[]> {
    const pool = await SqlConnection.getPool();
    const result = await pool.request()
      .input('opcion', 'DAI')
      .execute('SP_Consulta_Claves_Acceso');
    if (result.recordset[0] && result.recordset[0].codmsg === 200) {
      const row = result.recordset[0];
      return [new CredencialSRI(row.ruc, row.password, row.url, row.codmsg)];
    }
    return [];
  }
}