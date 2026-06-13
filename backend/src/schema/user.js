export const userTypeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  extend type Mutation {
    register(name: String!, email: String!, password: String!, role: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
  }
`;
