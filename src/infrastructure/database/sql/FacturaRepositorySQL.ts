import { IFacturaRepository } from '../../../domain/repositories/IFacturaRepository';
import { ClaveAcceso } from '../../../domain/entities/ClaveAcceso';
import SqlConnection from './SqlConnection';

export class FacturaRepositorySQL implements IFacturaRepository {
  async obtenerClavesPendientes(): Promise<ClaveAcceso[]> {
    const pool = await SqlConnection.getPool();
    const result = await pool.request()
      .input('opcion', 'DCA')
      .execute('SP_Consulta_Claves_Acceso');
    return result.recordset.map((row: any) => new ClaveAcceso(row.claveAcceso));
  }

  async actualizarRutaPdf(claveAcceso: string, rutaPdf: string): Promise<void> {
    const pool = await SqlConnection.getPool();
    await pool.request()
      .input('opcion', 'ACT')
      .input('claveacceso', claveAcceso)
      .input('valor', rutaPdf)
      .execute('Sp_Actualiza_Rutas');
  }
}