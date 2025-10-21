import * as faceapi from "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.5.7/dist/face-api.esm.js";
import { supabaseClient } from "../supabase/supabaseClient.js";

// Get references to HTML elements
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const placeholder = document.getElementById("placeholder");
const captureBtn = document.getElementById("captureBtn");
const stopBtn = document.getElementById("stopBtn");
const empIdInput = document.getElementById("empId");
const statusEl = document.getElementById("status");

let stream = null; // Holds the webcam stream

/**
 * Load face detection and recognition models
 */
async function loadModels() {
  statusEl.textContent = "Loading face detection models...";

  const MODEL_URL =
    "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.5.7/model/";

  // Set backend to WebGL for better performance
  await faceapi.tf.setBackend("webgl");

  // Load model weights for detection, landmarks, and recognition
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

  statusEl.textContent = "Models loaded.";
}

/**
 * Start the webcam feed
 */
async function startCamera() {
  try {
    // Request webcam access
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240 },
      audio: false,
    });

    // Attach video stream to <video> element
    video.srcObject = stream;
    await video.play();

    // Match canvas size to video dimensions
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    // Hide placeholder and show live video
    placeholder.style.display = "none";

    statusEl.textContent = "Camera ready. Click 'Capture Face'.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error accessing camera.";
  }
}

/**
 * Capture face and save embedding to database
 */
async function captureFace() {
  const empId = empIdInput.value.trim();

  // Check if Employee ID is entered
  if (!empId) {
    statusEl.textContent = "Please enter an Employee ID.";
    return;
  }

  statusEl.textContent = "Detecting face...";

  // Detect a single face from video stream
  const detection = await faceapi
    .detectSingleFace(video)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    statusEl.textContent = "No face detected. Try again.";
    return;
  }

  // Convert the descriptor (Float32Array) to a normal array
  const descriptor = Array.from(detection.descriptor);

  statusEl.textContent = "Face captured. Saving...";

  // Save embedding to Supabase (employees table)
  // Ensure the emp_id exists in the employees table
  const { error } = await supabaseClient
    .from("employees")
    .update({ face_embedding: descriptor })
    .eq("emp_id", empId);

  // Handle save result
  if (error) {
    console.error(error);
    statusEl.textContent =
      "Error saving to database. Check if Employee ID is valid.";
  } else {
    statusEl.textContent = `✅ Face enrolled for Employee ID ${empId}.`;
  }
}

/**
 * Stop camera stream and reset UI
 */
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  placeholder.style.display = "flex";
  statusEl.textContent = "Camera stopped.";
}

// Event listeners
captureBtn.addEventListener("click", captureFace);
stopBtn.addEventListener("click", stopCamera);

// Initialize: load models then start camera
loadModels().then(startCamera);
