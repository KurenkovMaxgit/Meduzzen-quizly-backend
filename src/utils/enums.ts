export enum UserRole {
  USER = 'user',
  SUPER_ADMIN = 'super_admin',
}

export enum CompanyStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
}

export enum CompanyRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum ActionType {
  REQUEST = 'request',
  INVITE = 'invite',
}

export enum ActionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export enum ActionDecision {
  ACCEPT = 'accept',
  DECLINE = 'decline',
}

export enum QuizQuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  // SURVEY = 'survey'
}

export enum AnswerCorrectness {
  CORRECT = 'correct',
  INCORRECT = 'incorrect',
}

export enum NotificationType {
  QUIZ_CREATED = 'quiz_created',
  SYSTEM_ALERT = 'system_alert',
  QUIZ_REMINDER = 'quiz_reminder',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}
