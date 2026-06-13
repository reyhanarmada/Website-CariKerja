import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import { typeDefs } from './schema/index.js';
import { resolvers } from './resolvers/index.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Inisialisasi Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

// Start Apollo Server
await server.start();

// Integrasikan Apollo middleware ke Express endpoint '/graphql'
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
          console.warn('Invalid token in request:', err.message);
        }
      }
      return { token, user };
    },
  }),
);

// Endpoint Health Check dasar untuk Docker Compose healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

const PORT = process.env.PORT || 4000;

await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
console.log(`🚀 Server berjalan di http://localhost:${PORT}/graphql`);
