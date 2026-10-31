import { getIdToken } from "../firebase.js";
import { appElement } from "../ui.js";
import { showQuizSelection } from "./quizSelection.js";


// ============================================================================
// Quiz result
// ============================================================================

export function renderResult(result) {
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

        const response = await fetch(
            "/api/certificate",
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
                // Response was not JSON; keep the default message.
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
        alert(
            "Could not generate certificate: "
            + error.message
        );
    }
}
