"""
certificate.py

Generates the PDF certificate for users who completed all quizzes.
"""

from datetime import datetime
from io import BytesIO

from flask import Blueprint, jsonify, request, send_file
from fpdf import FPDF

from auth import require_auth
from quiz_data import load_progress


bp = Blueprint("certificate", __name__)


@bp.post("/api/certificate")
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
    if not load_progress(user_id).get("completed", False):
        return jsonify({
            "error": "Not completed."
        }), 403

    return send_file(
        build_certificate_pdf(name),
        mimetype="application/pdf",
        as_attachment=True,
        download_name="ai-knowledge-quiz-certificate.pdf"
    )


def build_certificate_pdf(name):
    """Render the certificate for `name` and return it as an in-memory PDF."""

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

    return pdf_buffer
