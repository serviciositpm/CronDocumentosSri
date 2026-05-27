import dotenv from 'dotenv';
dotenv.config();

export default {
  sql: {
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    server: process.env.DB_HOST!,
    database: process.env.DB_NAME!,
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  },
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  mongoDb: process.env.MONGO_DB || 'dbLogs',
  sriWsdlUrl: process.env.SRI_URL || 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
};