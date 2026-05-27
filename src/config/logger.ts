import winston from 'winston';
import 'winston-mongodb';
import config from './config';

const mongoUri = `${config.mongoUri}/${config.mongoDb}`;

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.MongoDB({
      db: mongoUri,
      collection: 'logsFacturasSRI',
      options: { useUnifiedTopology: true },
      level: 'info'
    })
  ]
});