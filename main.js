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

const pose = new Pose.Pose({
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
  }
});

const camera = new CameraUtils.Camera(video, {
  onFrame: async () => await pose.send({ image: video }),
  width: 480,
  height: 360,
  facingMode: 'environment'
});
camera.start();
