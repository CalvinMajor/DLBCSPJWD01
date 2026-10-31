import { getIdToken } from "./firebase.js";


// ============================================================================
// API helper
// ============================================================================

export async function apiRequest(url, options = {}) {
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
