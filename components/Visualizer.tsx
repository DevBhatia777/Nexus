import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  data: Uint8Array;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ data, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!isActive) {
      // Draw a flat line or simple pulse if idle
      ctx.beginPath();
      ctx.strokeStyle = '#004444';
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const barWidth = (width / data.length) * 2.5;
    let barHeight;
    let x = 0;

    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#00ffff');
    gradient.addColorStop(0.5, '#0088aa');
    gradient.addColorStop(1, '#002233');

    ctx.fillStyle = gradient;

    for (let i = 0; i < data.length; i++) {
      barHeight = (data[i] / 255) * height * 1.5; // Amplify visual

      // Mirror effect
      ctx.fillRect(x, height / 2 - barHeight / 2, barWidth, barHeight);

      x += barWidth + 1;
    }
  }, [data, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={150} 
      className="w-full h-full"
    />
  );
};

export default Visualizer;