import { GuiaRemision } from "../entities/GuiaRemision";

export interface IGuiaRemisionParser {
  parse(xmlResponse: any, claveAcceso: string): Promise<GuiaRemision>;
}
