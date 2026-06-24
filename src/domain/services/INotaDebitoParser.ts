import { NotaDebito } from '../entities/NotaDebito';

export interface INotaDebitoParser {
  parse(xmlResponse: any, claveAcceso: string): Promise<NotaDebito>;
}