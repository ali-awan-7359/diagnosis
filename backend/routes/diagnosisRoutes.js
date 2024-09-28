const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const xlsx = require("xlsx");
const { exec } = require("child_process");

const baseDir = path.join(__dirname, "../");
const flagFilePath = path.join(baseDir, "stop.flag"); // Flag file to signal script stop

let scriptProcess;

// Start script
router.post("/start", (req, res) => {
  if (fs.existsSync(flagFilePath)) {
    fs.unlinkSync(flagFilePath); // Remove the flag file if it exists
  }

  scriptProcess = exec("python script.py", { cwd: baseDir });

  scriptProcess.stdout.on("data", (data) => {
    console.log(`Script output: ${data}`);
  });

  scriptProcess.stderr.on("data", (data) => {
    console.error(`Script error: ${data}`);
  });

  scriptProcess.on("close", (code) => {
    if (code !== 0) {
      console.error(`Script exited with code ${code}`);
    }
  });

  // Simulate a delay before sending the response
  setTimeout(() => {
    res.status(200).send("Script started successfully");
  }, 1000);  // 1-second delay to simulate startup time
});


// Stop script
router.post("/stop", (req, res) => {
  if (!scriptProcess) {
    return res.status(400).send("No script is running");
  }

  if (fs.existsSync(flagFilePath)) {
    return res.status(400).send("Script is already stopping");
  }

  // Create a flag file to signal the script to stop
  fs.writeFileSync(flagFilePath, "stop");

  // Optional: Wait for the script to stop
  scriptProcess.on("close", () => {
    res.status(200).send("Script stopped successfully");
  });

  scriptProcess.kill(); // Ensure process is terminated
});

// Fetch results
router.get("/results", (req, res) => {
  const fixationFile = path.join(
    baseDir,
    "eye_coordinates_with_avg_fixations.xlsx"
  );
  const saccadesFile = path.join(baseDir, "saccades_data_avg_eye.xlsx");

  if (!fs.existsSync(fixationFile) || !fs.existsSync(saccadesFile)) {
    return res.status(404).json({ error: "Results files are missing" });
  }

  res.json({
    fixationFile: "/api/diagnosis/file/eye_coordinates_with_avg_fixations.xlsx",
    saccadesFile: "/api/diagnosis/file/saccades_data_avg_eye.xlsx",
  });
});

// Serve result files
router.get("/file/:filename", (req, res) => {
  const file = path.join(baseDir, req.params.filename);
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).send("File not found");
  }
});

// Endpoint to get fixation points
router.get("/fixation-points", (req, res) => {
  const filePath = path.join(
    baseDir,
    "eye_coordinates_with_avg_fixations.xlsx"
  );
  if (fs.existsSync(filePath)) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    res.json(data);
  } else {
    res.status(404).send("Fixation points file not found.");
  }
});

// Endpoint to get saccades
router.get("/saccades", (req, res) => {
  const filePath = path.join(baseDir, "saccades_data_avg_eye.xlsx");
  if (fs.existsSync(filePath)) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    res.json(data);
  } else {
    res.status(404).send("Saccades file not found.");
  }
});

module.exports = router;
