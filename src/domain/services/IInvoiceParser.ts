import { Factura } from '../entities/Factura';

export interface IInvoiceParser {
  parse(xmlObject: any, claveAcceso: string): Promise<Factura>;
}