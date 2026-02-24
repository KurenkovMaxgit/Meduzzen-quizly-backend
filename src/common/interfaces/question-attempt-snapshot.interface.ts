export interface QuestionAttemptSnapshot {
  questionId: string;
  prompt: string;
  submittedAnswers: {
    answerId: string;
    content: string;
  }[];
}
