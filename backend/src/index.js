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
    context: async ({ req }) => ({ token: req.headers.token }),
  }),
);

// Endpoint Health Check dasar untuk Docker Compose healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

const PORT = process.env.PORT || 4000;

await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
console.log(`🚀 Server berjalan di http://localhost:${PORT}/graphql`);
