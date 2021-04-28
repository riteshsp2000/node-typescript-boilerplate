// Libraries
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import cors from 'cors';

// Config
import { init as dotenvInit } from './config/dotenv';
import { init as mongooseInit } from './config/mongoose';

// Schema
import { schema } from './schema';

(async () => {
  dotenvInit();
  mongooseInit();

  const app = express();
  const PORT = process.env.PORT || 8080;

  app.use(
    cors({
      origin: 'https://localhost:3000',
    })
  );

  const apolloServer = new ApolloServer({
    schema: await schema,
    playground: !process.env.NODE_ENV || process.env.NODE_ENV !== 'production',
    debug: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
  });

  apolloServer.applyMiddleware({
    app,
    cors: {
      origin: 'https://localhost:3000',
    },
  });

  // @ts-ignore
  app.listen(PORT, (err: any) => {
    if (err) console.error(`Express Server Error on Port ${PORT}`, err);

    console.info(`Express Server Started on Port ${PORT}`);
  });
})();
