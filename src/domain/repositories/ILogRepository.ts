export interface ILogRepository {
  info(message: string, meta?: any): Promise<void>;
  error(message: string, meta?: any): Promise<void>;
  warn(message: string, meta?: any): Promise<void>;
}