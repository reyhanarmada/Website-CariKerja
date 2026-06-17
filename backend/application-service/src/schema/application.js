export const applicationTypeDefs = `#graphql
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@external"])

  extend type Job @key(fields: "id", resolvable: false) {
    id: ID! @external
  }

  type Application {
    id: ID!
    jobId: ID!
    job: Job
    applicantName: String!
    applicantEmail: String!
    resumeUrl: String
    status: String!
    feedbackMessage: String
    interviewDate: String
    interviewTime: String
    appliedAt: String!
    applicantId: String
  }

  type Message {
    id: ID!
    senderId: ID!
    receiverId: ID!
    jobId: ID!
    content: String!
    createdAt: String!
    senderName: String
  }

  type DailyStat {
    date: String!
    views: Int!
    applications: Int!
  }

  input ApplicationInput {
    jobId: ID!
    applicantName: String!
    applicantEmail: String!
    resumeUrl: String
  }

  type Query {
    applications(jobId: ID): [Application!]!
    myApplications: [Application!]!
    applicationCount(jobId: ID!): Int!
    getMessages(jobId: ID!, userId: ID!): [Message!]!
    getDailyStats: [DailyStat!]!
    getRecruiterMessages: [Message!]!
  }

  type Mutation {
    applyJob(input: ApplicationInput!): Application!
    updateApplicationStatus(id: ID!, status: String!, message: String, interviewDate: String, interviewTime: String): Application!
    sendMessage(jobId: ID!, receiverId: ID!, content: String!): Message!
    deleteApplication(id: ID!): Boolean!
  }
`;
