import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const subgraphs = [
  { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://auth-service:4001/graphql' },
  { name: 'jobs', url: process.env.JOB_SERVICE_URL || 'http://job-service:4002/graphql' },
  { name: 'applications', url: process.env.APPLICATION_SERVICE_URL || 'http://application-service:4003/graphql' },
];

// Wait for all subgraphs to be fully online and responsive before initializing ApolloGateway
const waitOnSubgraphs = async () => {
  for (const service of subgraphs) {
    let success = false;
    while (!success) {
      try {
        console.log(`Checking connectivity to ${service.name} subgraph at ${service.url}...`);
        const res = await fetch(service.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'query { __schema { queryType { name } } }' }),
        });
        if (res.ok) {
          console.log(`Successfully connected to ${service.name} subgraph!`);
          success = true;
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        console.log(`Failed to connect to ${service.name} subgraph: ${err.message}. Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
};

await waitOnSubgraphs();

// Initialize Apollo Gateway
const gateway = new ApolloGateway({
  serviceList: subgraphs,
  buildService({ name, url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        // Forward the JWT token from the client request down to subgraphs
        if (context.token) {
          request.http.headers.set('authorization', `Bearer ${context.token}`);
        }
      },
    });
  },
});

const server = new ApolloServer({
  gateway,
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
      return { token };
    },
  }),
);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

const PORT = process.env.PORT || 4000;
await new Promise((resolve) => httpServer.listen({ port: PORT, host: '0.0.0.0' }, resolve));
console.log(`🚀 API Gateway running at http://localhost:${PORT}/graphql`);
