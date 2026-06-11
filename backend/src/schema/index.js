import { jobTypeDefs } from './job.js';
import { applicationTypeDefs } from './application.js';

const baseTypeDefs = `#graphql
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

export const typeDefs = [baseTypeDefs, jobTypeDefs, applicationTypeDefs];
