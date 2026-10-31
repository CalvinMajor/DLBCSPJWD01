import { apiRequest } from "../api.js";
import { state } from "../state.js";
import { appElement, escapeHtml, showError } from "../ui.js";
import { showQuizSelection } from "./quizSelection.js";
import { renderResult } from "./result.js";



// ============================================================================
// Question display
// ============================================================================

export function renderQuestion() {
    const question =
        state.quiz.questions[state.questionIndex];

    const totalQuestions =
        state.quiz.questions.length;

    const selectedAnswer =
        state.selectedAnswers[question.id];

    let html = `
        <h2>${escapeHtml(state.quiz.title)}</h2>

        <p>
            Question
            <strong>
                ${state.questionIndex + 1}
                / ${totalQuestions}
            </strong>
        </p>

        <h3>
            ${escapeHtml(question.question)}
        </h3>

        <form id="answer-form">

            <div class="answer-list">
    `;

    question.options.forEach((option, index) => {
        const checked =
            selectedAnswer === index
                ? "checked"
                : "";

        html += `
            <label class="answer">
                <input
                    type="radio"
                    name="answer"
                    value="${index}"
                    ${checked}
                >

                <span>
                    ${escapeHtml(option)}
                </span>
            </label>
        `;
    });

    html += `
            </div>

            <div class="navigation">

                ${state.questionIndex > 0
            ? `
                            <md-outlined-button
                                type="button"
                                id="previous-button"
                            >
                                Previous
                            </md-outlined-button>
                        `
            : ""
        }

                <md-filled-button type="submit">
                    ${state.questionIndex
            === totalQuestions - 1
            ? "Submit quiz"
            : "Next question"
        }
                </md-filled-button>

                <md-outlined-button
                    type="button"
                    id="quit-button"
                >
                    Back to quizzes
                </md-outlined-button>

            </div>

        </form>
    `;

    appElement.innerHTML = html;

    document
        .getElementById("answer-form")
        .addEventListener(
            "submit",
            handleAnswer
        );

    const previousButton =
        document.getElementById("previous-button");

    if (previousButton) {
        previousButton.addEventListener(
            "click",
            () => {
                state.questionIndex--;
                renderQuestion();
            }
        );
    }

    document
        .getElementById("quit-button")
        .addEventListener(
            "click",
            showQuizSelection
        );
}


// ============================================================================
// Answer handling
// ============================================================================

function handleAnswer(event) {
    event.preventDefault();

    const selected =
        document.querySelector(
            'input[name="answer"]:checked'
        );

    if (!selected) {
        alert("Please select an answer.");
        return;
    }

    const question =
        state.quiz.questions[state.questionIndex];

    state.selectedAnswers[question.id] =
        Number(selected.value);

    if (
        state.questionIndex
        <
        state.quiz.questions.length - 1
    ) {
        state.questionIndex++;
        renderQuestion();

    } else {
        submitQuiz();
    }
}


// ============================================================================
// Submit quiz
// ============================================================================

async function submitQuiz() {
    appElement.innerHTML = "<p>Submitting quiz...</p>";

    try {
        const result = await apiRequest(
            `/api/quizzes/${encodeURIComponent(state.quiz.quiz_id)}/submit`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    answers: state.selectedAnswers
                })
            }
        );

        renderResult(result);

    } catch (error) {
        showError(
            "Could not submit quiz.",
            error.message,
            showQuizSelection
        );
    }
}
