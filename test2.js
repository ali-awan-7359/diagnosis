const express = require("express");
const router = express.Router();
const multer = require("multer");
const FormData = require("form-data");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Get all Buddy module options
router.get("/", (req, res) => {
  res.json({
    options: [
      "Extract Text from Document",
      "Speech to Text",
      "Text to Speech",
      "Reading Assistance",
      "Voice Commands",
      "Interactive Document Interaction",
    ],
  });
});

// Handle file upload and text extraction
router.post("/extract-text", upload.single("document"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log("File received:", req.file); // Log file info

  try {
    const filePath = req.file.path;
    console.log(`Processing file at: ${filePath}`);

    const fileBuffer = fs.readFileSync(filePath);

    let extractedText = "";
    if (path.extname(req.file.originalname).toLowerCase() === ".pdf") {
      // Extract text from PDF
      const data = await pdfParse(fileBuffer);
      extractedText = data.text;
    } else {
      // Handle other file types or fallback logic
      const form = new FormData();
      form.append("document", fs.createReadStream(filePath));

      const response = await axios.post(
        "http://localhost:9001/api/buddy/extract-text", // Adjusted to your Flask server's URL
        form,
        {
          headers: form.getHeaders(),
        }
      );

      extractedText = response.data.extractedText;
    }

    res.json({ extractedText: extractedText });
  } catch (error) {
    console.error("Error extracting text:", error); // Log detailed error
    res.status(500).json({ error: "Error extracting text" });
  }
});

// Other routes
router.post("/speech-to-text", (req, res) => {
  res.json({ transcribedText: "Transcribed speech into text" });
});

router.post("/text-to-speech", (req, res) => {
  res.json({ message: "Text converted to speech" });
});

router.post("/reading-assistance", (req, res) => {
  res.json({ message: "Reading assistance provided" });
});

router.post("/voice-commands", (req, res) => {
  res.json({ message: "Voice command executed" });
});

router.post("/interactive-document", (req, res) => {
  res.json({ message: "Interactive document interaction handled" });
});

module.exports = router;
