import * as faceapi from "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.5.7/dist/face-api.esm.js";
import { supabaseClient as supabase } from "../supabase/supabaseClient.js";

// Grab all needed DOM elements
const cameraModal = document.getElementById("cameraModal");
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

// Confirmation overlay elements
const confirmationOverlay = document.getElementById("confirmationOverlay");
const confirmName = document.getElementById("confirmName");
const confirmEmpId = document.getElementById("confirmEmpId");
const confirmAction = document.getElementById("confirmAction");
const confirmTime = document.getElementById("confirmTime");

// Max distance threshold for matching (lower = stricter)
const MATCH_THRESHOLD = 0.55;

let stream = null; // camera stream reference
let running = false; // loop flag

/**
 * Load all the required face-api.js models
 */
async function loadModels() {
  statusEl.textContent = "Loading face models...";
  const MODEL_URL =
    "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.5.7/model/";

  // Use GPU for faster detection
  await faceapi.tf.setBackend("webgl");
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

  statusEl.textContent = "Models loaded.";
}

/**
 * Start the user's camera
 */
async function startCamera() {
  if (stream) return; // don't start again if already running
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }, // use front camera if available
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Camera access denied or unavailable.";
  }
}

/**
 * Stop the camera
 */
function stopCamera() {
  running = false;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

/**
 * Capture and encode a single face from the video stream
 * @returns {Promise<Float32Array | null>} The face descriptor or null.
 */
async function computeDescriptor() {
  const detection = await faceapi
    .detectSingleFace(video)
    .withFaceLandmarks()
    .withFaceDescriptor(); // 128-length float vector
  if (!detection) return null;
  return detection.descriptor;
}

/**
 * Call Supabase RPC to find the nearest face match
 * @param {Float32Array} descriptor
 * @returns {Promise<{emp_id: string, full_name: string, distance: number} | null>}
 */
async function findNearestEmployee(descriptor) {
  const arr = Array.from(descriptor); // convert Float32Array to regular array
  const { data, error } = await supabase.rpc("match_employee", {
    query: arr,
  });
  if (error) {
    console.error("RPC error", error);
    return null;
  }
  return data && data.length ? data[0] : null;
}

/**
 * Show the confirmation overlay after a match (IN or OUT)
 * @param {string} name
 * @param {string} empId
 * @param {'TIME IN' | 'TIME OUT'} action
 */
async function showConfirmation(name, empId, action) {
  confirmName.textContent = name;
  confirmEmpId.textContent = empId;
  confirmAction.textContent = action;
  confirmAction.classList.toggle("text-green-600", action === "TIME IN");
  confirmAction.classList.toggle("text-red-600", action === "TIME OUT");
  confirmTime.textContent = new Date().toLocaleTimeString();

  confirmationOverlay.classList.remove("hidden");
  cameraModal.close();
  stopCamera();

  // Auto-hide the overlay after 5 seconds
  setTimeout(() => {
    confirmationOverlay.classList.add("hidden");
  }, 5000);
}

/**
 * Check if the employee already has an open time log (no time_out yet) and record IN/OUT
 * @param {string} emp_id
 * @param {string} full_name
 */
async function handleTimeLog(emp_id, full_name) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Check if user already clocked in today but hasn't clocked out
  const { data: openLogs, error: selErr } = await supabase
    .from("raw_time_logs")
    .select("*")
    .eq("emp_id", emp_id)
    .is("time_out", null)
    .gte("time_in", todayStart.toISOString())
    .lte("time_in", todayEnd.toISOString())
    .limit(1);

  if (selErr) {
    console.error(selErr);
    statusEl.textContent = "Database error.";
    return;
  }

  // If user is clocked in, mark time_out
  if (openLogs && openLogs.length) {
    const log = openLogs[0];
    const { error: updErr } = await supabase
      .from("raw_time_logs")
      .update({ time_out: new Date().toISOString() })
      .eq("time_log_id", log.time_log_id);
    if (updErr) {
      console.error(updErr);
      statusEl.textContent = "Failed to record time out.";
    } else {
      showConfirmation(full_name, emp_id, "TIME OUT");
    }
  } else {
    // Otherwise, create a new time_in record
    const { error: insErr } = await supabase.from("raw_time_logs").insert({
      emp_id,
      official_time_id: 1,
      time_in: new Date().toISOString(),
      status: "present",
    });
    if (insErr) {
      console.error(insErr);
      statusEl.textContent = "Failed to record time in.";
    } else {
      showConfirmation(full_name, emp_id, "TIME IN");
    }
  }
}

/**
 * Main recognition loop (runs until manually stopped)
 */
async function recognitionLoop() {
  running = true;
  statusEl.textContent = "Scanning...";

  while (running) {
    const descriptor = await computeDescriptor();

    if (descriptor) {
      const nearest = await findNearestEmployee(descriptor);
      if (nearest) {
        const distance = nearest.distance;
        if (distance <= MATCH_THRESHOLD) {
          // Face matched successfully
          await handleTimeLog(nearest.emp_id, nearest.full_name);
          running = false;
        } else {
          statusEl.textContent = `Face detected but not matched (${distance.toFixed(
            3
          )}).`;
        }
      } else {
        statusEl.textContent = "No employee match.";
      }
    } else {
      statusEl.textContent = "No face detected.";
    }

    // Wait a bit before the next frame (to avoid hammering the CPU)
    await new Promise((r) => setTimeout(r, 800));
  }

  statusEl.textContent = "Scanner stopped.";
}

// Event listeners setup
startBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  await loadModels(); // load AI models
  await startCamera(); // enable webcam
  recognitionLoop(); // start scanning faces
});

stopBtn.addEventListener("click", (e) => {
  e.preventDefault();
  stopCamera();
});

// Update status when the modal is first opened by the main button
document
  .querySelector('button[onclick="cameraModal.showModal()"]')
  .addEventListener("click", () => {
    // cameraModal.showModal() is already called by the onclick attribute, but this is a cleaner way to handle side effects
    statusEl.textContent = "Open the scanner to begin.";
  });

// When the modal closes, ensure the camera is stopped
cameraModal.addEventListener("close", stopCamera);
