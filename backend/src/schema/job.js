export const jobTypeDefs = `#graphql
  type Job {
    id: ID!
    title: String!
    company: String!
    description: String!
    location: String!
    salary: String
    category: String!
    type: String!
    createdAt: String!
  }

  input JobInput {
    title: String!
    company: String!
    description: String!
    location: String!
    salary: String
    category: String!
    type: String!
  }

  extend type Query {
    jobs(search: String, location: String, category: String): [Job!]!
    job(id: ID!): Job
  }

  extend type Mutation {
    createJob(input: JobInput!): Job!
  }
`;
