import { Factura } from "../entities/Factura";
import {NotaDebito} from "../entities/NotaDebito";

export interface IPdfGenerator {
  generarFactura(factura: Factura, rutaDestino: string): Promise<string>;
  generarNotaDebito(notaDebito: NotaDebito, rutaDestino: string): Promise<string>;
}