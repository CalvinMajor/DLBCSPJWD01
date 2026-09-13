"""
app.py

Flask backend for the AI Knowledge Quiz.

- Serves the frontend.
- Reads quiz questions from Firestore.
- Verifies Firebase ID tokens.
- Evaluates submitted answers match correct answer server-side.
- Persists user progress to Firestore.

"""

import os
from functools import wraps

from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials, firestore
from flask import Flask, jsonify, render_template, request

from datetime import datetime

from fpdf import FPDF
from flask import send_file
from io import BytesIO


# ---------------------------------------------------------------------------
# Application configuration
# ---------------------------------------------------------------------------

app = Flask(__name__)


QUESTIONS_COLLECTION = "questions"
PROGRESS_COLLECTION = "user_progress"

# A quiz is passed with at least 2 correct answers out of 3.
PASS_SCORE = 2


# ---------------------------------------------------------------------------
# Firebase initialisation
# ---------------------------------------------------------------------------


BASE_DIR = Path(__file__).resolve().parent
CREDENTIALS_FILE = BASE_DIR / "firebase_credential.json"

if not CREDENTIALS_FILE.exists():
    raise FileNotFoundError(
        f"Firebase credentials not found: {CREDENTIALS_FILE}"
    )

cred = credentials.Certificate(str(CREDENTIALS_FILE))
firebase_admin.initialize_app(cred)

db = firestore.client()

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def require_auth(func):
    """

    The frontend obtains the token through Firebase Authentication.
    The backend verifies the token using the Firebase Admin SDK.

    The authenticated Firebase UID is passed as `user_id`.
    """

    @wraps(func)
    def decorated(*args, **kwargs):
        authorization = request.headers.get("Authorization", "")

        if not authorization.startswith("Bearer "):
            return jsonify({
                "error": "Missing authentication token."
            }), 401

        id_token = authorization.removeprefix("Bearer ").strip()

        if not id_token:
            return jsonify({
                "error": "Missing authentication token."
            }), 401

        try:
            decoded_token = auth.verify_id_token(id_token)
            user_id = decoded_token["uid"]

        except Exception as error:
         print("TOKEN VERIFICATION ERROR:", repr(error))

         return jsonify({
          "error": "Invalid authentication token.",
          "details": str(error)
       }), 401

        return func(*args, user_id=user_id, **kwargs)

    return decorated


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def get_all_quizzes():
    """
    Build a list of quizzes from the questions collection.

    Quizzes are derived from the quiz_id and quiz_title fields stored
    on each question.
    """

    documents = db.collection(QUESTIONS_COLLECTION).stream()

    quizzes = {}

    for document in documents:
        data = document.to_dict()

        quiz_id = data.get("quiz_id")
        quiz_title = data.get("quiz_title")

        if not quiz_id:
            continue

        quizzes[quiz_id] = {
            "quiz_id": quiz_id,
            "title": quiz_title,
        }

    return sorted(
        quizzes.values(),
        key=lambda quiz: quiz["quiz_id"]
    )


def get_quiz_questions(quiz_id):
    """
    Retrieve all questions belonging to a quiz.

    """

    documents = (
        db.collection(QUESTIONS_COLLECTION)
        .where("quiz_id", "==", quiz_id)
        .stream()
    )

    questions = list(documents)

    questions.sort(
        key=lambda document: document.to_dict().get("order", 0)
    )

    return questions


# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------

@app.get("/")
def index():
    """Serve the frontend."""
    return render_template("index.html")


# ---------------------------------------------------------------------------
# Quiz endpoints
# ---------------------------------------------------------------------------

@app.get("/api/quizzes")
@require_auth
def get_quizzes(user_id):
    """
    Return the available quizzes' IDs and titles.
    """

    quizzes = get_all_quizzes()

    return jsonify({
        "quizzes": quizzes
    })


@app.get("/api/quizzes/<quiz_id>")
@require_auth
def get_quiz(quiz_id, user_id):
    """
    Return the questions for a quiz
    """

    documents = get_quiz_questions(quiz_id)

    if not documents:
        return jsonify({
            "error": "Quiz not found."
        }), 404

    questions = []
    quiz_title = None

    for document in documents:
        data = document.to_dict()

        if quiz_title is None:
            quiz_title = data.get("quiz_title")

        questions.append({
            "id": document.id,
            "order": data["order"],
            "question": data["question"],
            "options": data["options"],
        })

    return jsonify({
        "quiz_id": quiz_id,
        "title": quiz_title,
        "questions": questions,
    })


@app.post("/api/quizzes/<quiz_id>/submit")
@require_auth
def submit_quiz(quiz_id, user_id):
    """
    Evaluate a submitted quiz and persist the result.

    Retrives the answers from Firestore,
    calculates the score, determines whether the quiz was passed, and
    stores the result against UID.
    """

    payload = request.get_json(silent=True)

    if not payload or not isinstance(payload.get("answers"), dict):
        return jsonify({
            "error": "Request must contain an answers object."
        }), 400

    submitted_answers = payload["answers"]

    questions = get_quiz_questions(quiz_id)

    if not questions:
        return jsonify({
            "error": "Quiz not found."
        }), 404

    score = 0

    for document in questions:
        data = document.to_dict()
        question_id = document.id

        if question_id not in submitted_answers:
            continue

        submitted_answer = submitted_answers[question_id]

        if submitted_answer == data["correct_answer"]:
            score += 1

    total_questions = len(questions)
    passed = score >= PASS_SCORE

# -----------------------------------------------------------------------
# Load progress
# -----------------------------------------------------------------------

    progress_ref = (
        db.collection(PROGRESS_COLLECTION)
        .document(user_id)
    )

    progress_snapshot = progress_ref.get()

    if progress_snapshot.exists:
        progress = progress_snapshot.to_dict()
    else:
        progress = {
            "quizzes_passed": [],
            "quiz_results": {},
            "completed": False,
        }

    quizzes_passed = progress.get("quizzes_passed", [])
    quiz_results = progress.get("quiz_results", {})

# -----------------------------------------------------------------------
# Update progress
# -----------------------------------------------------------------------


    quiz_results[quiz_id] = score

    if passed and quiz_id not in quizzes_passed:
        quizzes_passed.append(quiz_id)

    # Determine completion from the quizzes present in Firestore.
    all_quizzes = get_all_quizzes()
    all_quiz_ids = {
        quiz["quiz_id"]
        for quiz in all_quizzes
    }

    completed = (
        bool(all_quiz_ids)
        and all_quiz_ids.issubset(set(quizzes_passed))
    )

    progress_ref.set({
        "quizzes_passed": quizzes_passed,
        "quiz_results": quiz_results,
        "completed": completed,
    })

    return jsonify({
        "quiz_id": quiz_id,
        "score": score,
        "total": total_questions,
        "passed": passed,
        "completed": completed,
    })

# ---------------------------------------------------------------------------
# Progress endpoint
# ---------------------------------------------------------------------------

@app.get("/api/progress")
@require_auth
def get_progress(user_id):
    """
    Return the authenticated user's stored progress or empty progress.
    """

    progress_ref = (
        db.collection(PROGRESS_COLLECTION)
        .document(user_id)
    )

    progress_snapshot = progress_ref.get()

    if not progress_snapshot.exists:
        return jsonify({
            "quizzes_passed": [],
            "quiz_results": {},
            "completed": False,
        })

    return jsonify(progress_snapshot.to_dict())


# -----------------------------------------------------------------------
# PDF certificate
# ------------------------------------------------------------------------


@app.post("/api/certificate")
@require_auth
def generate_certificate(user_id):
    """
    Generate certificate if user has completed all quizzes.

    """

    payload = request.get_json(silent=True)

    if not payload or not isinstance(payload.get("name"), str):
        return jsonify({
            "error": "A name is required."
        }), 400

    name = payload["name"].strip()

    if not name:
        return jsonify({
            "error": "A name is required."
        }), 400

    # Check if the user has completed all quizzes.
    progress_ref = (
        db.collection(PROGRESS_COLLECTION)
        .document(user_id)
    )

    progress_snapshot = progress_ref.get()

    if not progress_snapshot.exists:
        return jsonify({
            "error": "Not completed."
        }), 403

    progress = progress_snapshot.to_dict()

    if not progress.get("completed", False):
        return jsonify({
            "error": "Not completed."
        }), 403

# -----------------------------------------------------------------------
# Generate certificate
# -----------------------------------------------------------------------

    # Generate PDF.

    pdf = FPDF(
    orientation="P",
    unit="mm",
    format="A5"
    )

    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    purple = (103, 80, 164)
    dark = (29, 27, 32)

    # Two frames max out attractiveness.
    pdf.set_draw_color(*purple)
    pdf.set_line_width(0.8)
    pdf.rect(10, 10, pdf.w - 20, pdf.h - 20)
    pdf.set_line_width(0.2)
    pdf.rect(13, 13, pdf.w - 26, pdf.h - 26)

    # Heading.
    pdf.set_text_color(*purple)
    pdf.set_font("Helvetica", "B", 24)

    pdf.ln(30)

    pdf.cell(
    0,
    12,
    "Certificate",
    align="C"
    )
    
    pdf.ln(14)

    pdf.set_text_color(*dark)
    pdf.set_font("Helvetica", "", 11)

    pdf.cell(
        0,
        7,
        "AI Knowledge Quiz",
        align="C"
    )

    # Award text.
    pdf.ln(22)

    pdf.set_font("Helvetica", "", 10)

    pdf.cell(
        0,
        7,
        "This certificate is awarded to",
        align="C"
    )

    # Name.
    pdf.ln(12)

    pdf.set_text_color(*purple)
    pdf.set_font("Helvetica", "B", 20)

    pdf.cell(
        0,
        12,
        name,
        align="C"
    )

    # Completion text.
    pdf.ln(16)

    pdf.set_text_color(*dark)
    pdf.set_font("Helvetica", "", 10)

    pdf.multi_cell(
        0,
        6,
        "for successfully completing all AI Knowledge Quizzes.",
        align="C"
    )

    # Date.
    pdf.ln(20)

    pdf.set_font("Helvetica", "", 9)

    pdf.cell(
        0,
        6,
        datetime.now().strftime("%d %B %Y"),
        align="C"
    )

    # Write PDF to memory.
    pdf_buffer = BytesIO()
    pdf.output(pdf_buffer)
    pdf_buffer.seek(0)

    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="ai-knowledge-quiz-certificate.pdf"
    )


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)