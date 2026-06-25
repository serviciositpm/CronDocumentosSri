import { NotaCredito } from '../entities/NotaCredito';

export interface INotaCreditoParser {
  parse(xmlResponse: any, claveAcceso: string): Promise<NotaCredito>;
}