export const generateFaceEmbedding = async (base64Image) => {
  if (!window.faceapi || !base64Image) return null;

  try {
    // Load models if not already loaded
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    if (!window.faceapi.nets.ssdMobilenetv1.isLoaded) await window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    if (!window.faceapi.nets.faceLandmark68Net.isLoaded) await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    if (!window.faceapi.nets.faceRecognitionNet.isLoaded) await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    const img = new Image();
    img.src = base64Image;
    await new Promise((resolve) => { img.onload = resolve; });

    const detection = await window.faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    if (detection && detection.descriptor) {
      return Array.from(detection.descriptor);
    }
    return null;
  } catch (err) {
    console.error('Face embedding generation error:', err);
    return null;
  }
};
