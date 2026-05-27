import { ClaveAcceso } from '../entities/ClaveAcceso';

export interface IFacturaRepository {
  obtenerClavesPendientes(): Promise<ClaveAcceso[]>;
  actualizarRutaPdf(claveAcceso: string, rutaPdf: string): Promise<void>;
}