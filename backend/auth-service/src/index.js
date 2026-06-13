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

import { userTypeDefs } from './schema/user.js';
import { userResolvers } from './resolvers/user.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Use buildSubgraphSchema for Apollo Federation v2 Subgraph
const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: parse(userTypeDefs),
    resolvers: userResolvers,
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
          console.warn('Invalid token in auth-service context:', err.message);
        }
      }
      return { token, user };
    },
  }),
);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

const PORT = process.env.PORT || 4001;
await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
console.log(`🚀 auth-service running at http://localhost:${PORT}/graphql`);
