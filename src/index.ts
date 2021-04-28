// Config
import { init as dotenvInit } from './config/dotenv';
import { init as mongooseInit } from './config/mongoose';

dotenvInit();
mongooseInit();
