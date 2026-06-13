export const jobTypeDefs = `#graphql
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@shareable"])

  type Job @key(fields: "id") {
    id: ID!
    title: String!
    company: String!
    description: String!
    location: String!
    salary: String
    category: String!
    type: String!
    createdAt: String!
    recruiterId: ID
    deadline: String
    status: String
    applicantCount: Int
    savedCount: Int
    minEducation: String
    logoUrl: String
  }

  input JobInput {
    title: String!
    description: String!
    location: String!
    salary: String
    category: String!
    type: String!
    deadline: String!
    status: String
    minEducation: String
  }

  type Query {
    jobs(search: String, location: String, category: String): [Job!]!
    job(id: ID!): Job
    myJobs: [Job!]!
    mySavedJobs: [Job!]!
  }

  type Mutation {
    createJob(input: JobInput!): Job!
    updateJobStatus(id: ID!, status: String!): Job!
    toggleSaveJob(jobId: ID!): Boolean!
  }
`;
