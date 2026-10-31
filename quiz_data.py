"""
quiz_data.py

Firestore access for quizzes, questions and user progress.
"""

from config import PROGRESS_COLLECTION, QUESTIONS_COLLECTION
from firebase_client import db


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


def load_progress(user_id):
    """
    Return the user's stored progress, or empty progress if none exists.
    """

    progress_snapshot = (
        db.collection(PROGRESS_COLLECTION)
        .document(user_id)
        .get()
    )

    if not progress_snapshot.exists:
        return {
            "quizzes_passed": [],
            "quiz_results": {},
            "completed": False,
        }

    return progress_snapshot.to_dict()


def save_progress(user_id, progress):
    """Store the user's progress against their UID."""

    (
        db.collection(PROGRESS_COLLECTION)
        .document(user_id)
        .set(progress)
    )
