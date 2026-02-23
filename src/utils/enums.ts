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
  SCORED = 'scored',
  // SURVEY = 'survey'
}

export enum AnswerCorrectness {
  CORRECT = 'correct',
  WRONG = 'wrong',
}
