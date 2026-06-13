export const userTypeDefs = `#graphql
  type Profile {
    userId: ID!
    name: String
    email: String
    bio: String
    pengalamanKerja: String
    skill: String
    portofolioUrl: String
  }

  type Notification {
    id: ID!
    userId: ID!
    message: String!
    isRead: Boolean!
    createdAt: String!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    companyName: String
    logoUrl: String
    profile: Profile
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User
    myNotifications: [Notification!]!
    myProfile: Profile
    profileByEmail(email: String!): Profile
    userById(id: ID!): User
  }

  type Mutation {
    register(name: String!, email: String!, password: String!, role: String!, companyName: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    updateName(name: String!): User!
    updateProfile(bio: String, pengalamanKerja: String, skill: String, portofolioUrl: String): Profile!
    markAsRead(id: ID!): Boolean!
    markAllAsRead: Boolean!
    createNotificationByEmail(email: String!, message: String!): Notification!
    updateRecruiterProfile(name: String!, companyName: String!, logoUrl: String): User!
  }
`;
