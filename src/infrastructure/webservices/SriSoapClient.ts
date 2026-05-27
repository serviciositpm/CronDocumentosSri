import * as soap from 'soap';
import { ISriClient } from '../../domain/services/ISriClient';
import config from '../../config/config';
import AppError from '../../shared/errors/AppError';

export class SriSoapClient implements ISriClient {
  private client: any;
  private ruc: string = '';
  private password: string = '';

  async initialize(ruc: string, password: string): Promise<void> {
    this.ruc = ruc;
    this.password = password;

    try {
      this.client = await new Promise((resolve, reject) => {
        soap.createClient(config.sriWsdlUrl, (err: any, client: any) => {
          if (err) {
            reject(new AppError(`Error al crear cliente SOAP: ${err.message}`, 500));
          } else {
            resolve(client);
          }
        });
      });
    } catch (error) {
      throw new AppError(`No se pudo inicializar el cliente SOAP: ${error}`, 500);
    }
  }

  async autorizarComprobante(claveAcceso: string): Promise<any> {
    if (!this.client) {
      throw new AppError('Cliente SOAP no inicializado. Llame a initialize() primero.', 500);
    }

    this.client.addSoapHeader(
      {
        'tns:ClaveAcceso': this.password,
        'tns:Ruc': this.ruc,
      },
      '',
      'tns',
      'http://www.w3.org/2000/09/xmldsig#'
    );

    const args = { claveAccesoComprobante: claveAcceso };

    try {
      const result = await new Promise((resolve, reject) => {
        this.client.autorizacionComprobante(args, (err: any, result: any) => {
          if (err) {
            reject(new AppError(`Error en autorizacionComprobante: ${err.message}`, 500));
          } else {
            resolve(result);
          }
        });
      });
      return result;
    } catch (error) {
      throw new AppError(`Fallo al consultar autorización para ${claveAcceso}: ${error}`, 500);
    }
  }
}