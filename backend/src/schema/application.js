export const applicationTypeDefs = `#graphql
  type Application {
    id: ID!
    jobId: ID!
    job: Job
    applicantName: String!
    applicantEmail: String!
    resumeUrl: String
    status: String!
    appliedAt: String!
  }

  input ApplicationInput {
    jobId: ID!
    applicantName: String!
    applicantEmail: String!
    resumeUrl: String
  }

  extend type Query {
    applications(jobId: ID): [Application!]!
  }

  extend type Mutation {
    applyJob(input: ApplicationInput!): Application!
    updateApplicationStatus(id: ID!, status: String!): Application!
    deleteApplication(id: ID!): Boolean!
  }
`;
