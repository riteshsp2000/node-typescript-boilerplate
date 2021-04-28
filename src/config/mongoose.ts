// Libraries
import mongoose from 'mongoose';

// Initialize Mongoose Connection
export const init = () => {
  const MONGOOSE_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    poolSize: 100,
    useFindAndModify: false,
    useCreateIndex: true,
  };
  mongoose.connect(process.env.MONGO_APP_URL!, MONGOOSE_OPTIONS);

  const db = mongoose.connection;

  db.on('error', (err) => console.error('Could not connect to database', err));
  db.once('open', () => console.info('Database Connected'));
};

// Check mongoose connection
export const db = mongoose.connection.readyState !== 1 && mongoose.connection;
