import { Retencion } from '../entities/Retencion';

export interface IRetencionParser {
  parse(xmlResponse: any, claveAcceso: string): Promise<Retencion>;
}