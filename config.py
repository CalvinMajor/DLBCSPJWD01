"""
config.py

Shared configuration for the AI Knowledge Quiz backend.
"""

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
CREDENTIALS_FILE = BASE_DIR / "firebase_credential.json"

QUESTIONS_COLLECTION = "questions"
PROGRESS_COLLECTION = "user_progress"

# A quiz is passed with at least 2 correct answers out of 3.
PASS_SCORE = 2
