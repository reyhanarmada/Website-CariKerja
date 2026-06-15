export const profileTypeDefs = `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type SeekerProfile @key(fields: "id") {
    id: ID!
    userId: Int!
    bio: String
    education: String
    experience: String
    skills: String
    resumeUrl: String
    portfolioUrl: String
    updatedAt: String
  }

  type Query {
    getProfileByUserId(userId: Int!): SeekerProfile
    mySeekerProfile: SeekerProfile
  }

  type Mutation {
    updateSeekerProfile(
      bio: String
      education: String
      experience: String
      skills: String
      resumeUrl: String
      portfolioUrl: String
    ): SeekerProfile!
  }
`;
