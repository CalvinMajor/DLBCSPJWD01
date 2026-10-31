"""
routes.py

Frontend and quiz/progress API endpoints.
"""

from flask import Blueprint, jsonify, render_template, request

from auth import require_auth
from config import PASS_SCORE
from quiz_data import (
    get_all_quizzes,
    get_quiz_questions,
    load_progress,
    save_progress,
)


bp = Blueprint("quiz", __name__)


# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------

@bp.get("/")
def index():
    """Serve the frontend."""
    return render_template("index.html")


# ---------------------------------------------------------------------------
# Quiz endpoints
# ---------------------------------------------------------------------------

@bp.get("/api/quizzes")
@require_auth
def get_quizzes(user_id):
    """
    Return the available quizzes' IDs and titles.
    """

    quizzes = get_all_quizzes()

    return jsonify({
        "quizzes": quizzes
    })


@bp.get("/api/quizzes/<quiz_id>")
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


@bp.post("/api/quizzes/<quiz_id>/submit")
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

    # Update progress.
    progress = load_progress(user_id)

    quizzes_passed = progress.get("quizzes_passed", [])
    quiz_results = progress.get("quiz_results", {})

    quiz_results[quiz_id] = score

    if passed and quiz_id not in quizzes_passed:
        quizzes_passed.append(quiz_id)

    # Determine completion from the quizzes present in Firestore.
    all_quiz_ids = {
        quiz["quiz_id"]
        for quiz in get_all_quizzes()
    }

    completed = (
        bool(all_quiz_ids)
        and all_quiz_ids.issubset(set(quizzes_passed))
    )

    save_progress(user_id, {
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

@bp.get("/api/progress")
@require_auth
def get_progress(user_id):
    """
    Return the authenticated user's stored progress or empty progress.
    """

    return jsonify(load_progress(user_id))
