import { Factura } from "../entities/Factura";

export interface IPdfGenerator {
  generarFactura(factura: Factura, rutaDestino: string): Promise<string>;
}