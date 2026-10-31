// ============================================================================
// Shared UI helpers
// ============================================================================

export const appElement = document.getElementById("app");


export function showError(
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


export function escapeHtml(value) {
    const element =
        document.createElement("div");

    element.textContent = value;

    return element.innerHTML;
}
