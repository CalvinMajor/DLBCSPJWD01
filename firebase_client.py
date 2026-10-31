"""
firebase_client.py

Initialises the Firebase Admin SDK and exposes the Firestore client.
"""

import firebase_admin
from firebase_admin import credentials, firestore

from config import CREDENTIALS_FILE


if not CREDENTIALS_FILE.exists():
    raise FileNotFoundError(
        f"Firebase credentials not found: {CREDENTIALS_FILE}"
    )

cred = credentials.Certificate(str(CREDENTIALS_FILE))
firebase_admin.initialize_app(cred)

db = firestore.client()
