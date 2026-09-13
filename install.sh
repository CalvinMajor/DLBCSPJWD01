#!/bin/bash

echo "================================================="
echo "  The AI Knowledge Quiz - Setup"
echo "================================================="

# Exit immediately if a command exits with a non-zero status
set -e

# 1. Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 could not be found. Please install Python 3.8 or higher."
    exit 1
fi

echo "Python 3 present: $(python3 --version)"

# 2. Create venv if it doesn't exist, in any case activate it
VENV_DIR=".venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment in './$VENV_DIR'..."
    python3 -m venv "$VENV_DIR"
else
    echo "Virtual environment './$VENV_DIR' exists."
fi

echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

if [ $? -ne 0 ]; then
    echo "Failed to activate virtual environment."
    exit 1
fi

# 3. Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

#4. Install Dependencies 
python3 -m pip install firebase_admin flask flask-cors python-dotenv fpdf2




echo ""
echo "================================================="
echo "Setup complete!"
echo "Next steps:"
echo "  1. Place the separately provided JSON file in this folder"
echo "  2. Run: /app.py in the virtual environment './$VENV_DIR'
echo "  3. Try the app
echo "================================================="