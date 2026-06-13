import { jobResolvers } from './job.js';
import { applicationResolvers } from './application.js';
import { userResolvers } from './user.js';

export const resolvers = {
  Query: {
    ...jobResolvers.Query,
    ...applicationResolvers.Query,
  },
  Mutation: {
    ...jobResolvers.Mutation,
    ...applicationResolvers.Mutation,
    ...userResolvers.Mutation,
  },
  // Custom Type Resolvers
  Application: {
    ...applicationResolvers.Application,
  },
};
