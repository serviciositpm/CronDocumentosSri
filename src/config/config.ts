import dotenv from 'dotenv';
import {AppConfig} from '../types/config';
dotenv.config();

const config: AppConfig = {
  db: {
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'SRI',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },
  sri: {
    url: process.env.SRI_URL || 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
  },
};

export default config;