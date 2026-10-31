import { apiRequest } from "../api.js";
import { state } from "../state.js";
import { appElement, escapeHtml, showError } from "../ui.js";
import { renderQuestion } from "./question.js";


// ============================================================================
// Quiz selection
// ============================================================================

export async function showQuizSelection() {
    appElement.innerHTML = "<p>Loading quizzes...</p>";

    try {
        const [quizData, progress] = await Promise.all([
            apiRequest("/api/quizzes"),
            apiRequest("/api/progress")
        ]);

        renderQuizSelection(
            quizData.quizzes,
            progress
        );

    } catch (error) {
        showError(
            "Could not load quizzes.",
            error.message
        );
    }
}


function renderQuizSelection(quizzes, progress) {
    const passed = progress.quizzes_passed || [];

    let html = `
        <h2>Choose a quiz</h2>

        <p>
            Completed:
            <strong>${passed.length} / ${quizzes.length}</strong>
        </p>

        <ul class="quiz-list">
    `;

    for (const quiz of quizzes) {
        const hasPassed =
            passed.includes(quiz.quiz_id);

        html += `
            <li class="quiz-card">
                <strong>
                    ${escapeHtml(quiz.title)}
                </strong>

                ${hasPassed
                ? "<span>Passed</span>"
                : ""
            }

                <md-filled-button
                    class="quiz-button"
                    data-quiz-id="${escapeHtml(quiz.quiz_id)}"
                >
                    ${hasPassed
                ? "Take again"
                : "Start quiz"
            }
                </md-filled-button>
            </li>
        `;
    }

    html += "</ul>";

    if (progress.completed) {
        html += `
            <h2>Congratulations!</h2>

            <p>
                You have completed all quizzes.
            </p>
        `;
    }

    appElement.innerHTML = html;

    document
        .querySelectorAll(".quiz-button")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => startQuiz(button.dataset.quizId)
            );
        });
}


// ============================================================================
// Start quiz
// ============================================================================

async function startQuiz(quizId) {
    appElement.innerHTML = "<p>Loading quiz...</p>";

    try {
        state.quiz = await apiRequest(
            `/api/quizzes/${encodeURIComponent(quizId)}`
        );

        state.questionIndex = 0;
        state.selectedAnswers = {};

        renderQuestion();

    } catch (error) {
        showError(
            "Could not load the quiz.",
            error.message,
            showQuizSelection
        );
    }
}
