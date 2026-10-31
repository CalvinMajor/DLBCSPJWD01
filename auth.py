"""
auth.py

Verifies Firebase ID tokens sent by the frontend.
"""

from functools import wraps

from firebase_admin import auth
from flask import jsonify, request

# Importing the client ensures Firebase is initialised before tokens are verified.
import firebase_client  # noqa: F401


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

        except Exception:
            return jsonify({
                "error": "Invalid authentication token."
            }), 401

        return func(*args, user_id=user_id, **kwargs)

    return decorated
