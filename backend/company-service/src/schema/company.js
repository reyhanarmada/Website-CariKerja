export const companyTypeDefs = `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type CompanyProfile @key(fields: "id") {
    id: ID!
    recruiterId: Int!
    companyName: String!
    description: String
    industry: String
    location: String
    websiteUrl: String
    logoUrl: String
    cultureDescription: String
    createdAt: String
    reviews: [CompanyReview]
  }

  type CompanyReview {
    id: ID!
    companyId: Int!
    reviewerId: Int!
    rating: Int!
    reviewText: String
    createdAt: String
  }

  type Query {
    getCompany(id: ID!): CompanyProfile
    getAllCompanies: [CompanyProfile]
    myCompanyProfile: CompanyProfile
  }

  type Mutation {
    updateCompanyProfile(
      companyName: String!
      description: String
      industry: String
      location: String
      websiteUrl: String
      logoUrl: String
      cultureDescription: String
    ): CompanyProfile!

    addCompanyReview(
      companyId: Int!
      rating: Int!
      reviewText: String
    ): CompanyReview!
  }
`;
