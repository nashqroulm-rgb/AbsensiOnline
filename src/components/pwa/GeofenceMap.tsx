import { useEffect, useRef } from 'react';

interface GeofenceMapProps {
  centerLat: number;
  centerLng: number;
  radius: number;
  userLat?: number;
  userLng?: number;
  inRange: boolean;
}

export default function GeofenceMap({ centerLat, centerLng, radius, userLat, userLng, inRange }: GeofenceMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#e8f5e9');
    bgGrad.addColorStop(1, '#e3f2fd');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const centerX = W / 2;
    const centerY = H / 2;
    const displayRadius = Math.min(W, H) * 0.35;

    // Geofence outer glow
    const glowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, displayRadius + 20);
    glowGrad.addColorStop(0, inRange ? 'rgba(22, 163, 74, 0.15)' : 'rgba(217, 119, 6, 0.15)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, displayRadius + 20, 0, Math.PI * 2);
    ctx.fill();

    // Geofence fill
    const zoneGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, displayRadius);
    zoneGrad.addColorStop(0, inRange ? 'rgba(22, 163, 74, 0.12)' : 'rgba(217, 119, 6, 0.12)');
    zoneGrad.addColorStop(1, inRange ? 'rgba(22, 163, 74, 0.05)' : 'rgba(217, 119, 6, 0.05)');
    ctx.fillStyle = zoneGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, displayRadius, 0, Math.PI * 2);
    ctx.fill();

    // Geofence border (dashed)
    ctx.strokeStyle = inRange ? '#16A34A' : '#D97706';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, displayRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Radius label
    ctx.fillStyle = inRange ? '#16A34A' : '#D97706';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`r = ${radius}m`, centerX, centerY - displayRadius - 6);

    // User position (if available)
    if (userLat !== undefined && userLng !== undefined) {
      const latDiff = userLat - centerLat;
      const lngDiff = userLng - centerLng;
      const scale = displayRadius / (radius * 0.00001);
      const userX = centerX + lngDiff * scale * 111320 * Math.cos(centerLat * Math.PI / 180) * 0.00001;
      const userY = centerY - latDiff * scale * 110574 * 0.00001;

      const clampedX = Math.max(10, Math.min(W - 10, userX));
      const clampedY = Math.max(10, Math.min(H - 10, userY));

      // Accuracy ring
      ctx.strokeStyle = inRange ? 'rgba(22,163,74,0.3)' : 'rgba(217,119,6,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, 14, 0, Math.PI * 2);
      ctx.stroke();

      // User dot shadow
      ctx.shadowColor = inRange ? 'rgba(22,163,74,0.4)' : 'rgba(217,119,6,0.4)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = inRange ? '#16A34A' : '#D97706';
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // User dot inner
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Connecting line to center
      ctx.strokeStyle = 'rgba(100,100,100,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(clampedX, clampedY);
      ctx.lineTo(centerX, centerY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Center pin
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Compass
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', W - 16, 18);
  }, [centerLat, centerLng, radius, userLat, userLng, inRange]);

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={180}
      className="w-full rounded-lg"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}
