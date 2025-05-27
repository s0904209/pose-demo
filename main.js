const video = document.getElementById('video');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
const resultDiv = document.getElementById('result');

canvas.width = 480;
canvas.height = 360;

function analyzePose(landmarks) {
  if (!landmarks) return "無法偵測姿勢";
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
  const hipDiff = Math.abs(leftHip.y - rightHip.y);
  const pelvisTilt = Math.abs(leftHip.x - rightHip.x);

  if (shoulderDiff > 0.05) return "❗ 肩膀歪斜，建議肩頸放鬆課程";
  if (pelvisTilt > 0.1) return "❗ 骨盆傾斜，建議下背按摩或骨盆調整";
  return "✅ 姿勢良好，可定期保養";
}

function sendPoseData(landmarks) {
  const poseData = landmarks.map(lm => ({
    x: lm.x,
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility,
  }));

  const payload = {
    user_id: 'test_user',  // 可日後由登入系統決定
    timestamp: new Date().toISOString(),
    pose: poseData,
  };

  fetch('http://<你的後端 IP>:8000/api/pose/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Failed to upload");
    }
    console.log("✅ Pose data uploaded");
  })
  .catch(err => {
    console.error("❌ Upload error:", err);
  });
}

let lastUploadTime = 0;

function shouldUpload() {
  const now = Date.now();
  if (now - lastUploadTime > 5000) {  // 每 5 秒最多上傳一次
    lastUploadTime = now;
    return true;
  }
  return false;
}

// ✅ 修正這一行：直接用 Pose 而不是 Pose.Pose
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

pose.onResults(results => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (results.poseLandmarks) {
    drawConnectors(ctx, results.poseLandmarks, Pose.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
    drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1 });

    const msg = analyzePose(results.poseLandmarks);
    resultDiv.innerText = msg;

    // 🔄 每次偵測都上傳（你可加個計數器改成每5秒上傳一次）
    if (shouldUpload()) {
        sendPoseData(results.poseLandmarks);
    }
  }
});

// ✅ 修正：直接使用 Camera（不是 CameraUtils.Camera）
const camera = new Camera(video, {
  onFrame: async () => await pose.send({ image: video }),
  width: 480,
  height: 360,
  facingMode: 'environment'
});

// ✅ 加上錯誤處理
camera.start().catch((err) => {
  alert("🚫 無法啟用鏡頭，請確認是否已授權或裝置支援！");
  resultDiv.innerText = "⚠️ 鏡頭啟用失敗，請確認權限或使用支援的裝置";
  console.error("Camera start failed:", err);
});
