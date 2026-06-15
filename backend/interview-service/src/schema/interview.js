export const interviewTypeDefs = `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type InterviewSchedule @key(fields: "id") {
    id: ID!
    applicationId: Int!
    jobId: Int!
    recruiterId: Int!
    applicantId: Int!
    interviewDate: String!
    interviewTime: String!
    meetingLink: String
    status: String
    notes: String
    createdAt: String
  }

  type Query {
    getInterview(id: ID!): InterviewSchedule
    getInterviewsByJob(jobId: Int!): [InterviewSchedule]
    myInterviews: [InterviewSchedule]
  }

  type Mutation {
    scheduleInterview(
      applicationId: Int!
      jobId: Int!
      applicantId: Int!
      interviewDate: String!
      interviewTime: String!
      meetingLink: String
      notes: String
    ): InterviewSchedule!

    updateInterviewStatus(
      id: ID!
      status: String!
    ): InterviewSchedule!
  }
`;
