import mongoose, { Schema, Document } from 'mongoose';

export interface ILog extends Document {
  timestamp: Date;
  level: string;
  message: string;
  service: string;
  meta?: any;
}

const LogSchema: Schema = new Schema({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, required: true },
  message: { type: String, required: true },
  service: { type: String, required: true, default: 'sri-invoice-processor' },
  meta: { type: Schema.Types.Mixed }
});

export const LogModel = mongoose.model<ILog>('logsFacturasSRI', LogSchema);