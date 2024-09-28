import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";

const OptionButton = ({ option, onBack }) => {
  const [extractedText, setExtractedText] = useState("");
  const [transcribedText, setTranscribedText] = useState("");
  const [interactiveText, setInteractiveText] = useState("");
  const [error, setError] = useState("");
  const [recognition, setRecognition] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [textToRead, setTextToRead] = useState("");
  const [currentOption, setCurrentOption] = useState(option);
  const speechToTextButtonRef = useRef(null);

  useEffect(() => {
    if (currentOption === "Speech to Text" && speechToTextButtonRef.current) {
      setTimeout(() => {
        speechToTextButtonRef.current.click();
      }, 100);
    }
  }, [currentOption]);

  const startSpeechRecognition = (type) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = "en-US";
    recognitionInstance.interimResults = false;
    recognitionInstance.maxAlternatives = 1;
    recognitionInstance.continuous = type === "Speech to Text";

    recognitionInstance.onresult = (event) => {
      const transcript = event.results[event.resultIndex][0].transcript;
      if (type === "Speech to Text") {
        setTranscribedText((prevText) => prevText + " " + transcript);
      } else if (type === "Voice Commands") {
        handleVoiceCommands(transcript);
      }
      setError("");
    };

    recognitionInstance.onerror = (event) => {
      setError("Error in speech recognition: " + event.error);
    };

    recognitionInstance.onend = () => {
      setIsRecognizing(false);
    };

    recognitionInstance.onstart = () => {
      setIsRecognizing(true);
    };

    setRecognition(recognitionInstance);
    recognitionInstance.start();
  };

  const handleButtonClick = async (type) => {
    if (type === "Enhanced Document Interaction and Text Extraction") {
      if (recognition && isRecognizing) {
        recognition.stop();
        setIsRecognizing(false);
      }

      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".png, .jpg, .jpeg, .pdf";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const formData = new FormData();
          formData.append("document", file);

          try {
            const response = await axios.post(
              "http://localhost:9000/api/buddy/extract-text",
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              }
            );
            setExtractedText(response.data.extractedText);
            setError("");
          } catch (error) {
            console.error("Error uploading file:", error);
            setError("Failed to extract text from document.");
            setExtractedText("");
          }
        }
      };
      input.click();

      setTimeout(() => {
        if (recognition) {
          readAloud(
            "Extracting text now. Do you want to do anything else? If not, say stop listening detective."
          );
          setTimeout(() => {
            if (!isRecognizing) {
              recognition.start();
              setIsRecognizing(true);
            }
          }, 500);
        }
      }, 1000);
    } else if (type === "Speech to Text" || type === "Voice Commands") {
      if (recognition) {
        recognition.stop();
        setIsRecognizing(false);
      }
      startSpeechRecognition(type);
    } else if (type === "Interactive Document Interaction") {
      if (recognition && isRecognizing) {
        recognition.stop();
        setIsRecognizing(false);
      }

      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".png, .jpg, .jpeg, .pdf";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const formData = new FormData();
          formData.append("document", file);

          try {
            const response = await axios.post(
              "http://localhost:9000/api/buddy/extract-text",
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              }
            );
            setInteractiveText(response.data.extractedText);
            setError("");
          } catch (error) {
            console.error("Error uploading file:", error);
            setError("Failed to extract text from document.");
            setInteractiveText("");
          }
        }
      };
      input.click();
    }
  };

  const handleStopRecognition = () => {
    if (recognition) {
      recognition.stop();
      setIsRecognizing(false);
      setRecognition(null);
    }
  };

  const readAloud = (text) => {
    if (text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopReadingAloud = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleVoiceCommands = (transcript) => {
    const command = transcript.toLowerCase();
    if (command.includes("extract text")) {
      handleButtonClick("Enhanced Document Interaction and Text Extraction");
    } else if (command.includes("start speech to text")) {
      setCurrentOption("Speech to Text");
    } else if (command.includes("start text to speech")) {
      setCurrentOption("Text to Speech");
    } else if (command.includes("stop listening detective")) {
      handleStopRecognition();
    } else {
      if (currentOption === "Voice Commands") {
        readAloud("Command not recognized. Please try again.");
      }
    }
  };

  const saveFile = (fileType) => {
    if (fileType === "pdf") {
      const doc = new jsPDF();
      doc.text(interactiveText, 10, 10);
      doc.save("document.pdf");
    } else if (fileType === "txt") {
      const blob = new Blob([interactiveText], {
        type: "text/plain",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "document.txt";
      link.click();
    }
  };

  const editText = () => {
    const newText = prompt("Edit the extracted text:", interactiveText);
    if (newText !== null) {
      setInteractiveText(newText);
    }
  };

  const shareText = () => {
    navigator
      .share({
        title: "Shared Document",
        text: interactiveText,
        url: "",
      })
      .catch((error) => console.error("Error sharing text:", error));
  };

  return (
    <div>
      {currentOption === "Interactive Document Interaction" ? (
        <div className="interactive-screen">
          <button className="back-button" onClick={onBack}>
            Back to Options
          </button>
          <button
            className="extract-to-interact-button"
            onClick={handleButtonClick.bind(
              null,
              "Interactive Document Interaction"
            )}
          >
            Extract to Interact
          </button>
          <textarea
            className="interactive-text-field"
            placeholder="Extracted text will appear here..."
            value={interactiveText}
            readOnly
          />
          <button className="save-as-txt" onClick={() => saveFile("txt")}>
            Save as .txt
          </button>
          <button className="save-as-pdf" onClick={() => saveFile("pdf")}>
            Save as .pdf
          </button>
          <button className="edit-button" onClick={editText}>
            Edit
          </button>
          <button className="share-button" onClick={shareText}>
            Share
          </button>
        </div>
      ) : extractedText || transcribedText ? (
        <div className="functional-screen">
          <button className="back-button" onClick={onBack}>
            Back to Options
          </button>
          {extractedText && (
            <>
              <button
                className="read-aloud-button"
                onClick={() => readAloud(extractedText)}
                disabled={isSpeaking}
              >
                {isSpeaking ? "Reading..." : "Read Aloud"}
              </button>
              {isSpeaking && (
                <button
                  className="stop-reading-button"
                  onClick={stopReadingAloud}
                >
                  Stop Reading Aloud
                </button>
              )}
              <div className="extracted-text">
                <h4>Extracted Text:</h4>
                <p>{extractedText}</p>
              </div>
            </>
          )}
          {transcribedText && (
            <div className="transcribed-text">
              <h4>Transcribed Text:</h4>
              <p>{transcribedText}</p>
              <button className="stop-button" onClick={handleStopRecognition}>
                Stop Speech Recognition
              </button>
            </div>
          )}
        </div>
      ) : currentOption === "Text to Speech" ? (
        <div className="tts-screen">
          <button className="back-button" onClick={onBack}>
            Back to Options
          </button>
          <textarea
            placeholder="Paste text here..."
            value={textToRead}
            onChange={(e) => setTextToRead(e.target.value)}
          />
          <button
            className="read-aloud-button"
            onClick={() => readAloud(textToRead)}
          >
            Read Aloud
          </button>
          {isSpeaking && (
            <button className="stop-reading-button" onClick={stopReadingAloud}>
              Stop Reading Aloud
            </button>
          )}
        </div>
      ) : (
        <div>
          <button
            ref={speechToTextButtonRef}
            className="option-button"
            onClick={() => handleButtonClick(currentOption)}
          >
            {currentOption}
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default OptionButton;
