import {CredencialSRI} from '../entities/CredencialSRI';

export interface ICredencialSRIRepository {
  obtenerCredenciales(): Promise<CredencialSRI | null>;
}