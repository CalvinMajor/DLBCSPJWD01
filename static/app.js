import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// ============================================================================
// Firebase configuration
// ============================================================================

const firebaseConfig = {
    apiKey: "AIzaSyDTtcxphN84DfkrrvwbPOXex5nRPSudNQs",
    appId: "1:200290989753:web:c40b49226fc1a78e730d68"
};


// ============================================================================
// Firebase initialisation
// ============================================================================

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);


// ============================================================================
// Application state
// ============================================================================

const appElement = document.getElementById("app");

let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let selectedAnswers = {};


// ============================================================================
// Authentication
// ============================================================================

async function authenticate() {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Authentication failed:", error);

        showError(
            "Authentication failed.",
            error.message
        );
    }
}


onAuthStateChanged(auth, async (user) => {
    if (!user) {
        return;
    }

    currentUser = user;

    await showQuizSelection();
});


async function getIdToken() {
    if (!currentUser) {
        throw new Error("No authenticated user.");
    }

    return await currentUser.getIdToken();
}


// ============================================================================
// API helper
// ============================================================================

async function apiRequest(url, options = {}) {
    const token = await getIdToken();

    const headers = {
        "Authorization": `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "The server returned an error."
        );
    }

    return data;
}


// ============================================================================
// Quiz selection
// ============================================================================

async function showQuizSelection() {
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
        console.error(error);

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
        currentQuiz = await apiRequest(
            `/api/quizzes/${encodeURIComponent(quizId)}`
        );

        currentQuestionIndex = 0;
        selectedAnswers = {};

        renderQuestion();

    } catch (error) {
        console.error(error);

        showError(
            "Could not load the quiz.",
            error.message,
            showQuizSelection
        );
    }
}


// ============================================================================
// Question display
// ============================================================================

function renderQuestion() {
    const question =
        currentQuiz.questions[currentQuestionIndex];

    const totalQuestions =
        currentQuiz.questions.length;

    const selectedAnswer =
        selectedAnswers[question.id];

    let html = `
        <h2>${escapeHtml(currentQuiz.title)}</h2>

        <p>
            Question
            <strong>
                ${currentQuestionIndex + 1}
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

                ${currentQuestionIndex > 0
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
                    ${currentQuestionIndex
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
                currentQuestionIndex--;
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
        currentQuiz.questions[currentQuestionIndex];

    selectedAnswers[question.id] =
        Number(selected.value);

    if (
        currentQuestionIndex
        <
        currentQuiz.questions.length - 1
    ) {
        currentQuestionIndex++;
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
            `/api/quizzes/${encodeURIComponent(currentQuiz.quiz_id)}/submit`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    answers: selectedAnswers
                })
            }
        );

        renderResult(result);

    } catch (error) {
        console.error(error);

        showError(
            "Could not submit quiz.",
            error.message,
            showQuizSelection
        );
    }
}



// ============================================================================
// Quiz result
// ============================================================================

function renderResult(result) {
    console.log("Quiz result received:", result);

    const percentage =
        Math.round(
            (result.score / result.total) * 100
        );

    let html = `
        <h2>Quiz complete</h2>

        <p>
            Score:
            <strong>
                ${result.score} / ${result.total}
            </strong>
            (${percentage}%)
        </p>
    `;

    if (result.passed) {
        html += `
            <p>
                <strong>Passed!</strong>
            </p>
        `;
    } else {
        html += `
            <p>
                <strong>Not passed.</strong>
            </p>
        `;
    }

    if (result.completed) {
        html += `
            <h2>Congratulations! You completed all quizzes.</h2>

            <p>
                You have successfully completed
                the entire quiz programme.
            </p>

            <form id="certificate-form">

                <label for="certificate-name">
                    Your name
                </label>

                <input
                    id="certificate-name"
                    type="text"
                    maxlength="100"
                    required
                >

                <div class="navigation">

                    <md-filled-button type="submit">
                        Generate certificate
                    </md-filled-button>

                </div>

            </form>
        `;
    }

    html += `
        <div class="navigation">

            <md-filled-button
                id="continue-button"
            >
                Back to quizzes
            </md-filled-button>

        </div>
    `;

    appElement.innerHTML = html;

    if (result.completed) {
        document
            .getElementById("certificate-form")
            .addEventListener(
                "submit",
                generateCertificate
            );
    }

    document
        .getElementById("continue-button")
        .addEventListener(
            "click",
            showQuizSelection
        );
}


// ============================================================================
// Certificate generation
// ============================================================================

async function generateCertificate(event) {
    event.preventDefault();

    const name =
        document
            .getElementById("certificate-name")
            .value
            .trim();

    if (!name) {
        return;
    }

    try {
        const token = await getIdToken();

        console.log("Generating certificate for:", name);
        console.log("Token received:", Boolean(token));

        const response = await fetch(
            window.location.origin + "/api/certificate",
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name
                })
            }
        );

        if (!response.ok) {
            let message = "Could not generate certificate.";

            try {
                const data = await response.json();
                message = data.error || message;
            } catch {

            }

            throw new Error(message);
        }

        const pdfBlob = await response.blob();

        const url =
            URL.createObjectURL(pdfBlob);

        const link =
            document.createElement("a");

        link.href = url;
        link.download =
            "ai-knowledge-quiz-certificate.pdf";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

    } catch (error) {
        console.error(
            "Certificate generation failed:",
            error
        );

        alert(
            "Could not generate certificate: "
            + error.message
        );
    }
}

// ============================================================================
// Error display
// ============================================================================

function showError(
    title,
    message,
    backFunction = null
) {
    let html = `
        <h2>${escapeHtml(title)}</h2>

        <p>${escapeHtml(message)}</p>
    `;

    if (backFunction) {
        html += `
            <div class="navigation">

                <md-outlined-button
                    id="error-back-button"
                >
                    Back
                </md-outlined-button>

            </div>
        `;
    }

    appElement.innerHTML = html;

    if (backFunction) {
        document
            .getElementById("error-back-button")
            .addEventListener(
                "click",
                backFunction
            );
    }
}


// ============================================================================
// Utility
// ============================================================================

function escapeHtml(value) {
    const element =
        document.createElement("div");

    element.textContent = value;

    return element.innerHTML;
}


// ============================================================================
// Start application
// ============================================================================

authenticate();