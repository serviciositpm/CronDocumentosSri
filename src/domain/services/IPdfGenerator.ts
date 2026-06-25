import { Factura } from "../entities/Factura";
import { NotaDebito } from "../entities/NotaDebito";
import { NotaCredito } from "../entities/NotaCredito";

export interface IPdfGenerator {
  generarFactura(factura: Factura, rutaDestino: string): Promise<string>;
  generarNotaDebito(notaDebito: NotaDebito, rutaDestino: string): Promise<string>;
  generarNotaCredito(notaCredito: NotaCredito, rutaDestino: string): Promise<string>;
}