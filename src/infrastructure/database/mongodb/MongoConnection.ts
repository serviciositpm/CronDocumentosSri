import mongoose from 'mongoose';
import config from '../../../config/config';

class MongoConnection {
  private static instance: typeof mongoose;

  static async connect(): Promise<typeof mongoose> {
    if (!MongoConnection.instance) {
      const uri = `${config.mongoUri}/${config.mongoDb}`;
      MongoConnection.instance = await mongoose.connect(uri);
      console.log('✅ Conectado a MongoDB');
    }
    return MongoConnection.instance;
  }

  static async disconnect(): Promise<void> {
    if (MongoConnection.instance) {
      await mongoose.disconnect();
    }
  }
}

export default MongoConnection;