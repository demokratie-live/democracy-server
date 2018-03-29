export default `

  type TokenResult {
      succeeded: Boolean
  }

  type NotificationSettings {
    disableAll: Boolean
    disableUntil: Date
    procedures: [String]
    tags: [String]
  }

  type Query {
    notificationSettings: NotificationSettings
  }

  type Mutation {
    addToken(token: String!, os: String!): TokenResult
    updateNotificationSettings(disableAll: String, disableUntil: Date, procedures: [String], tags: [String]): NotificationSettings
  }

  `;
