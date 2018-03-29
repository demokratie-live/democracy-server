export default `

  type TokenResult {
      succeeded: Boolean
  }

  type NotificationSettings {
    enabled: Boolean
    newVote: Boolean
    newPreperation: Boolean
    disableUntil: Date
    procedures: [String]
    tags: [String]
  }

  type Query {
    notificationSettings: NotificationSettings
  }

  type Mutation {
    addToken(token: String!, os: String!): TokenResult
    updateNotificationSettings(
      enabled: Boolean,
      newVote: Boolean,
      newPreperation: Boolean, 
      disableUntil: Date, 
      procedures: [String], 
      tags: [String]
    ): NotificationSettings
  }

  `;
