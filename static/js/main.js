import {
    signInAnonymously,
    onAuthStateChanged
} from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { auth } from "./firebase.js";
import { showError } from "./ui.js";
import { showQuizSelection } from "./views/quizSelection.js";


// ============================================================================
// Authentication
// ============================================================================

async function authenticate() {
    try {
        await signInAnonymously(auth);
    } catch (error) {
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

    await showQuizSelection();
});


// ============================================================================
// Start application
// ============================================================================

authenticate();
