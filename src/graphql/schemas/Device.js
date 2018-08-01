export default `

  type Device {
    notificationSettings: NotificationSettings
  }

  type TokenResult {
    succeeded: Boolean
  }

  type CodeResult {
    reason: String
    allowNewUser: Boolean
    succeeded: Boolean!
  }

  type ReCodeResult {
    reason: String
    succeeded: Boolean!
  }

  type VerificationResult {
    reason: String
    succeeded: Boolean!
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
    requestCode(newPhone: String!, oldPhoneHash: String): CodeResult
    resendCode(newPhone: String!): ReCodeResult
    requestVerification(code: String!, newPhoneHash: String!, newUser: Boolean): VerificationResult

    addToken(token: String!, os: String!): TokenResult
    
    updateNotificationSettings(
      enabled: Boolean,
      newVote: Boolean,
      newPreperation: Boolean, 
      disableUntil: Date, 
      procedures: [String], 
      tags: [String]
    ): NotificationSettings

    toggleNotification(procedureId: String!): Procedure
  }

  `;
