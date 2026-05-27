export interface ISriClient {
  /**
   * Inicializa el cliente SOAP con las credenciales del SRI (RUC y password)
   * @param ruc - Número de RUC del emisor
   * @param password - Clave de acceso al web service del SRI
   */
  initialize(ruc: string, password: string): Promise<void>;

  /**
   * Consulta la autorización de un comprobante electrónico mediante su clave de acceso.
   * @param claveAcceso - Clave de acceso del comprobante
   * @returns El objeto de respuesta SOAP con la autorización y el XML del comprobante
   */
  autorizarComprobante(claveAcceso: string): Promise<any>;
}