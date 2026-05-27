import { IFacturaRepository } from '../../domain/repositories/IFacturaRepository';
import { ClaveAcceso } from '../../domain/entities/ClaveAcceso';

export class GetClavesAccesoUseCase {
  constructor(private facturaRepo: IFacturaRepository) {}
  async execute(): Promise<ClaveAcceso[]> {
    return this.facturaRepo.obtenerClavesPendientes();
  }
}