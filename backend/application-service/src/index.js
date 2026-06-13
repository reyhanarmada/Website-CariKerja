import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import jwt from 'jsonwebtoken';

import { applicationTypeDefs } from './schema/application.js';
import { applicationResolvers } from './resolvers/application.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Use buildSubgraphSchema for Apollo Federation v2 Subgraph
const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: parse(applicationTypeDefs),
    resolvers: applicationResolvers,
  }),
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await server.start();

app.use(
  '/graphql',
  cors(),
  bodyParser.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || '';
      let token = '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        token = req.headers.token || '';
      }

      let user = null;
      if (token) {
        try {
          user = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
        } catch (err) {
          console.warn('Invalid token in application-service context:', err.message);
        }
      }
      return { token, user };
    },
  }),
);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

const PORT = process.env.PORT || 4003;
await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
console.log(`🚀 application-service running at http://localhost:${PORT}/graphql`);
