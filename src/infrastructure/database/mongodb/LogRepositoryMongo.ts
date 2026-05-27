import { ILogRepository } from '../../../domain/repositories/ILogRepository';
import { LogModel } from './LogModel';

export class LogRepositoryMongo implements ILogRepository {
  async info(message: string, meta?: any): Promise<void> {
    await LogModel.create({ level: 'info', message, meta });
  }

  async error(message: string, meta?: any): Promise<void> {
    await LogModel.create({ level: 'error', message, meta });
  }

  async warn(message: string, meta?: any): Promise<void> {
    await LogModel.create({ level: 'warn', message, meta });
  }
}