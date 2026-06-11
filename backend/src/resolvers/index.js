import { jobResolvers } from './job.js';
import { applicationResolvers } from './application.js';

export const resolvers = {
  Query: {
    ...jobResolvers.Query,
    ...applicationResolvers.Query,
  },
  Mutation: {
    ...jobResolvers.Mutation,
    ...applicationResolvers.Mutation,
  },
  // Custom Type Resolvers
  Application: {
    ...applicationResolvers.Application,
  },
};
