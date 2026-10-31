// ============================================================================
// Application state
// ============================================================================

// Kept in one object so every module can read and update the same values.
export const state = {
    quiz: null,
    questionIndex: 0,
    selectedAnswers: {}
};
