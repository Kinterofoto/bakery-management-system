import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadModels = async () => {
    if (modelsLoaded) {
        console.log("FaceAPI models already loaded, skipping");
        return true;
    }

    const MODEL_URL = '/models';
    try {
        console.log("Loading FaceAPI models from", MODEL_URL);

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        modelsLoaded = true;
        console.log("FaceAPI models loaded successfully");
        return true;
    } catch (e) {
        console.error('Error loading models:', e);
        return false;
    }
};

export const createMatcher = (profiles: { id: string; descriptor: number[] }[]) => {
    const labeledDescriptors = profiles.map(profile => {
        return new faceapi.LabeledFaceDescriptors(
            profile.id,
            [new Float32Array(profile.descriptor)]
        );
    });
    return new faceapi.FaceMatcher(labeledDescriptors, 0.6); // 0.6 is distance threshold
};
