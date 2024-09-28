from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import pytesseract
from PIL import Image
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Set the path to the Tesseract executable
pytesseract.pytesseract.tesseract_cmd = r"c:\Program Files\Tesseract-OCR\tesseract.exe"


def extract_text_from_image(image):
    try:
        image = image.resize((image.width * 2, image.height * 2))
        image = image.convert("L")
        extracted_text = pytesseract.image_to_string(
            image, lang="eng", config="--psm 6"
        )
        return extracted_text.strip()
    except Exception as e:
        print(f"Error in extract_text_from_image: {e}")
        return None


@app.route("/api/buddy/extract-text", methods=["POST"])
def extract_text():
    if "document" not in request.files:
        print("No file part in request")
        return jsonify({"error": "No file part"}), 400

    file = request.files["document"]

    if file.filename == "":
        print("No selected file")
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        try:
            image = Image.open(file.stream)
            extracted_text = extract_text_from_image(image)

            if extracted_text:
                return jsonify({"extractedText": extracted_text})
            else:
                print("Text extraction failed")
                return jsonify({"error": "Text extraction failed"}), 500
        except Exception as e:
            print(f"Error processing file: {e}")
            return jsonify({"error": "Error processing file"}), 500

    print("Invalid file type")
    return jsonify({"error": "Invalid file type"}), 400


def allowed_file(filename):
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf"}
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9001)
