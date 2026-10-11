const asset = name => `${import.meta.env.BASE_URL}assets/sensor/${name}.png`;
export const sensorParts = [
  { id: 'sensor-P-13', label: 'P-13', category: 'SENSOR', width: 2, height: 2, mass: 4, rotationStep: 90,
    url: asset('P-13'), animationUrl: asset('P-13-frames'), frameCount: 16, framesPerSecond: 8 },
];
