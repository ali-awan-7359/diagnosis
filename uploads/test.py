import cv2
import pytesseract
import os

# Specify the path to tesseract executable
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

img_path = "c:/Users/Ali/Desktop/60%/Buddy/buddy-module/uploads/test.jpg"
if not os.path.exists(img_path):
    print("Image file does not exist or path is incorrect:", img_path)
else:
    img = cv2.imread(img_path)
    if img is None:
        print(
            "Failed to load image. Please check the file path and integrity of the image."
        )
    else:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Increase contrast
        gray = cv2.equalizeHist(gray)

        # Resize image to reduce DPI
        height, width = gray.shape
        new_width = int(width * 0.3)  # Resize to 30% of the original width
        new_height = int(height * 0.3)  # Resize to 30% of the original height
        resized = cv2.resize(gray, (new_width, new_height))

        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            resized, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )

        # Denoise image
        thresh = cv2.fastNlMeansDenoising(thresh, None, 30, 7, 21)

        # Save the preprocessed image for debugging
        cv2.imwrite("preprocessed_test.jpg", thresh)

        # Run Tesseract OCR on the preprocessed image
        text = pytesseract.image_to_string(thresh)
        print(text)
