export interface QuestionAttemptSnapshot {
  questionId: string;
  prompt: string;
  userAnswers: {
    answerId: string;
    content: string;
    isCorrect: boolean;
  }[];
  wasQuestionAnsweredCorrectly: number;
}
