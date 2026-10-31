"""
app.py

Flask backend for the AI Knowledge Quiz.

- Serves the frontend.
- Reads quiz questions from Firestore.
- Verifies Firebase ID tokens.
- Evaluates submitted answers match correct answer server-side.
- Persists user progress to Firestore.
- Generates a PDF certificate once all quizzes are passed.

Modules:
- config.py           shared constants
- firebase_client.py  Firebase / Firestore initialisation
- auth.py             token verification decorator
- quiz_data.py        Firestore reads and writes
- routes.py           frontend, quiz and progress endpoints
- certificate.py      PDF certificate endpoint
"""

from flask import Flask

import certificate
import routes


app = Flask(__name__)

app.register_blueprint(routes.bp)
app.register_blueprint(certificate.bp)


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)
