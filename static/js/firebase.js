import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { getAuth } from
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

export const auth = getAuth(firebaseApp);


export async function getIdToken() {
    if (!auth.currentUser) {
        throw new Error("No authenticated user.");
    }

    return await auth.currentUser.getIdToken();
}
