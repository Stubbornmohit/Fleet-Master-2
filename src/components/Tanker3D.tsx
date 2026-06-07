import React, { useRef, useState, useEffect } from 'react';

interface Tanker3DProps {
  className?: string;
  autoRotate?: boolean;
  cargoFilling?: number; // 0 to 1 representing tank level
  colorAccent?: string; // e.g. '#ff5a1f'
  interactive?: boolean;
  statusLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Simple vector definitions for the Tanker Truck
interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface Face3D {
  indices: number[];
  color: string;
  fill?: boolean;
}

export default function Tanker3D({
  className = '',
  autoRotate = true,
  cargoFilling = 0.75,
  colorAccent = '#ff5a1f',
  interactive = true,
  statusLabel = '3D REAL-TIME SENSOR TELEMETRY',
  size = 'md'
}: Tanker3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Rotation Angles
  const [angleY, setAngleY] = useState(0.4);
  const [angleX, setAngleX] = useState(-0.15);
  const [angleZ, setAngleZ] = useState(0);
  
  // Interaction states
  const [isDragging, setIsDragging] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Size configurations
  const width = size === 'sm' ? 240 : size === 'md' ? 420 : 640;
  const height = size === 'sm' ? 160 : size === 'md' ? 280 : 380;

  // Generate a high-fidelity 3D Tanker Asset
  // Coordinates are relative to local center (0,0,-4)
  const vertices: Vector3D[] = [];
  const faces: Face3D[] = [];
  const lines: number[][] = [];

  // 1. Generate cylinder tank representation
  // We place a collection of circles along the Z-axis (from z = -1.2 to z = 1.0)
  const tankSegments = 10;
  const tankRadialSegments = 12;
  const tankRadius = 0.55;
  const tankLength = 2.4;
  const tankZOffset = -0.4; // shift back slightly

  const tankVertexOffset = vertices.length;

  for (let s = 0; s <= tankSegments; s++) {
    const z = tankZOffset + (s / tankSegments) * tankLength - (tankLength / 2);
    for (let r = 0; r < tankRadialSegments; r++) {
      const theta = (r / tankRadialSegments) * Math.PI * 2;
      const x = Math.cos(theta) * tankRadius;
      const y = Math.sin(theta) * tankRadius - 0.1; // slightly higher than chassis
      vertices.push({ x, y, z });
    }
  }

  // Draw longitudinal circles
  for (let s = 0; s <= tankSegments; s++) {
    const sOffset = tankVertexOffset + s * tankRadialSegments;
    for (let r = 0; r < tankRadialSegments; r++) {
      const nextR = (r + 1) % tankRadialSegments;
      lines.push([sOffset + r, sOffset + nextR]);
    }
  }

  // Draw horizontal ribs
  for (let s = 0; s < tankSegments; s++) {
    const sOffset = tankVertexOffset + s * tankRadialSegments;
    const nextSOffset = sOffset + tankRadialSegments;
    for (let r = 0; r < tankRadialSegments; r++) {
      lines.push([sOffset + r, nextSOffset + r]);
    }
  }

  // 2. Generate Chassis structure
  const chassisVertexOffset = vertices.length;
  // Box of coordinates from z = -1.7 to z = 1.7
  const chH = -0.22; // height
  const chW = 0.44; // width
  const chLenStart = -1.60;
  const chLenEnd = 1.60;

  vertices.push(
    { x: -chW, y: chH, z: chLenStart }, // 0
    { x: chW, y: chH, z: chLenStart },  // 1
    { x: chW, y: chH - 0.08, z: chLenStart }, // 2
    { x: -chW, y: chH - 0.08, z: chLenStart }, // 3
    { x: -chW, y: chH, z: chLenEnd }, // 4
    { x: chW, y: chH, z: chLenEnd },  // 5
    { x: chW, y: chH - 0.08, z: chLenEnd }, // 6
    { x: -chW, y: chH - 0.08, z: chLenEnd }  // 7
  );

  // Chassis lines
  lines.push(
    [chassisVertexOffset + 0, chassisVertexOffset + 1],
    [chassisVertexOffset + 1, chassisVertexOffset + 2],
    [chassisVertexOffset + 2, chassisVertexOffset + 3],
    [chassisVertexOffset + 3, chassisVertexOffset + 0],

    [chassisVertexOffset + 4, chassisVertexOffset + 5],
    [chassisVertexOffset + 5, chassisVertexOffset + 6],
    [chassisVertexOffset + 6, chassisVertexOffset + 7],
    [chassisVertexOffset + 7, chassisVertexOffset + 4],

    [chassisVertexOffset + 0, chassisVertexOffset + 4],
    [chassisVertexOffset + 1, chassisVertexOffset + 5],
    [chassisVertexOffset + 2, chassisVertexOffset + 6],
    [chassisVertexOffset + 3, chassisVertexOffset + 7]
  );

  // 3. Cabin Box (Z-axis offset from 1.0 to 1.8)
  const cabVertexOffset = vertices.length;
  const cabBottom = chassisVertexOffset + 5; // near chassis end
  const cabH = 0.5; // taller
  const cabW = 0.46;
  const cabZStart = 1.0;
  const cabZEnd = 1.75;
  const cabTopHeight = 0.45;

  vertices.push(
    { x: -cabW, y: chH + 0.02, z: cabZStart }, // 0: left back bottom
    { x: cabW, y: chH + 0.02, z: cabZStart },  // 1: right back bottom
    { x: cabW, y: cabTopHeight, z: cabZStart }, // 2: right back top
    { x: -cabW, y: cabTopHeight, z: cabZStart }, // 3: left back top
    
    { x: -cabW, y: chH + 0.02, z: cabZEnd },  // 4: left front bottom
    { x: cabW, y: chH + 0.02, z: cabZEnd },   // 5: right front bottom
    { x: cabW, y: cabTopHeight - 0.12, z: cabZEnd }, // 6: right front top sloped windshield
    { x: -cabW, y: cabTopHeight - 0.12, z: cabZEnd }  // 7: left front top sloped windshield
  );

  // Cabin connections
  lines.push(
    [cabVertexOffset + 0, cabVertexOffset + 1],
    [cabVertexOffset + 1, cabVertexOffset + 2],
    [cabVertexOffset + 2, cabVertexOffset + 3],
    [cabVertexOffset + 3, cabVertexOffset + 0],

    [cabVertexOffset + 4, cabVertexOffset + 5],
    [cabVertexOffset + 5, cabVertexOffset + 6],
    [cabVertexOffset + 6, cabVertexOffset + 7],
    [cabVertexOffset + 7, cabVertexOffset + 4],

    [cabVertexOffset + 0, cabVertexOffset + 4],
    [cabVertexOffset + 1, cabVertexOffset + 5],
    [cabVertexOffset + 2, cabVertexOffset + 6],
    [cabVertexOffset + 3, cabVertexOffset + 7]
  );

  // Windshield lines (slanted front)
  lines.push([cabVertexOffset + 2, cabVertexOffset + 6]);
  lines.push([cabVertexOffset + 3, cabVertexOffset + 7]);

  // 4. Wheels representation (3 pairs of wheels along the structure)
  const wheelRadius = 0.22;
  const wheelPositions = [
    { z: -1.2, xOffset: 0.46, yOffset: chH - 0.16 }, // Back dual axles
    { z: -0.7, xOffset: 0.46, yOffset: chH - 0.16 }, 
    { z: 1.4, xOffset: 0.46, yOffset: chH - 0.16 }  // Front steer axle
  ];

  const drawWheel = (z: number, xOff: number, yOff: number) => {
    const startIdx = vertices.length;
    const segments = 8;
    const wWidth = 0.12;

    // Left and right wheels
    for (const side of [-1, 1]) {
      const center_x = side * xOff;
      const baseVertex = vertices.length;
      
      for (let w = 0; w < segments; w++) {
        const phi = (w / segments) * Math.PI * 2;
        const wx = center_x + Math.sin(phi) * 0.01; // thin width offset
        const wy = yOff + Math.sin(phi) * wheelRadius;
        const wz = z + Math.cos(phi) * wheelRadius;
        vertices.push({ x: wx, y: wy, z: wz });
        
        const wx2 = center_x + side * wWidth + Math.sin(phi) * 0.01;
        vertices.push({ x: wx2, y: wy, z: wz });
      }

      // Draw circular shapes
      for (let w = 0; w < segments; w++) {
        const nextW = (w + 1) % segments;
        lines.push([baseVertex + w * 2, baseVertex + nextW * 2]);
        lines.push([baseVertex + w * 2 + 1, baseVertex + nextW * 2 + 1]);
        lines.push([baseVertex + w * 2, baseVertex + w * 2 + 1]);
      }
    }
  };

  wheelPositions.forEach(p => drawWheel(p.z, p.xOffset, p.yOffset));

  // Handle auto rotation animation
  useEffect(() => {
    if (!autoRotate || isDragging) return;
    let animId: number;
    const loop = () => {
      setAngleY(prev => (prev + 0.007) % (Math.PI * 2));
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [autoRotate, isDragging]);

  // Main canvas draw routine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with high quality
    ctx.clearRect(0, 0, width, height);

    // Coordinate projection functions
    const project = (v: Vector3D) => {
      // Rotation matrices inside the projection loop
      // 1. Rotate Y (altitude angle)
      let x1 = v.x * Math.cos(angleY) - v.z * Math.sin(angleY);
      let z1 = v.x * Math.sin(angleY) + v.z * Math.cos(angleY);

      // 2. Rotate X (elevation pitch)
      let y2 = v.y * Math.cos(angleX) - z1 * Math.sin(angleX);
      let z2 = v.y * Math.sin(angleX) + z1 * Math.cos(angleX);

      // 3. Rotate Z (roll indicator)
      let x3 = x1 * Math.cos(angleZ) - y2 * Math.sin(angleZ);
      let y3 = x1 * Math.sin(angleZ) + y2 * Math.cos(angleZ);

      // Perspective transformation
      const scaleFactor = 3.5;
      const depth = 4.5;
      const perspective = scaleFactor / (z2 + depth);
      
      const px = width / 2 + x3 * perspective * (width * 0.45);
      const py = height / 2.1 - y3 * perspective * (height * 0.45); // slight elevation up
      return { x: px, y: py, z: z2 };
    };

    // Project all points
    const pPoints = vertices.map(v => project(v));

    // Render floor wireframe ground grid for a luxury telemetry deck aesthetic
    const gridPoints: Vector3D[] = [];
    const gridSize = 3.0;
    const gridDivs = 8;
    const groundY = chH - 0.38;

    for (let i = 0; i <= gridDivs; i++) {
      const offset = (i / gridDivs) * gridSize - gridSize / 2;
      gridPoints.push({ x: offset, y: groundY, z: -gridSize / 2 });
      gridPoints.push({ x: offset, y: groundY, z: gridSize / 2 });
      gridPoints.push({ x: -gridSize / 2, y: groundY, z: offset });
      gridPoints.push({ x: gridSize / 2, y: groundY, z: offset });
    }

    const pGrid = gridPoints.map(v => project(v));
    ctx.strokeStyle = '#2b211f';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < pGrid.length; i += 2) {
      ctx.beginPath();
      ctx.moveTo(pGrid[i].x, pGrid[i].y);
      ctx.lineTo(pGrid[i + 1].x, pGrid[i + 1].y);
      ctx.stroke();
    }

    // Render cargo liquid substance cylinder face overlays to show real-time filling telemetry!
    // Using simple vector polygons inside the projected tank segment coordinates
    if (cargoFilling > 0) {
      ctx.fillStyle = `${colorAccent}18`; // fill transparent highlight matching status and volume
      ctx.beginPath();
      // grab radial indices representing the lower half of the tank segment
      const endSeg = Math.floor(tankSegments * cargoFilling);
      for (let s = 0; s <= endSeg; s++) {
        const sOffset = tankVertexOffset + s * tankRadialSegments;
        const bottomIndex = sOffset + Math.floor(tankRadialSegments / 2);
        const pBottom = pPoints[bottomIndex];
        if (s === 0) {
          ctx.moveTo(pBottom.x, pBottom.y);
        } else {
          ctx.lineTo(pBottom.x, pBottom.y);
        }
      }
      for (let s = endSeg; s >= 0; s--) {
        const sOffset = tankVertexOffset + s * tankRadialSegments;
        const middleOffset = sOffset + 0; // top side segment
        const pMid = pPoints[middleOffset];
        ctx.lineTo(pMid.x, pMid.y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Render high-contrast 3D outline wireframe
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    lines.forEach(([iA, iB]) => {
      const pA = pPoints[iA];
      const pB = pPoints[iB];
      
      // Determine distance-based color attenuation for a beautiful realistic 3D overlay depth
      const avgZ = (pA.z + pB.z) / 2;
      const depthAlpha = Math.max(0.2, Math.min(1.0, (1.8 - (avgZ + 0.3))));

      // Accented glowing lines on the actual tank area
      const isTankLine = iA < chassisVertexOffset;
      if (isTankLine) {
        ctx.strokeStyle = `rgba(255, 90, 31, ${depthAlpha * 0.85})`;
        ctx.lineWidth = size === 'sm' ? 1.0 : 1.3;
      } else {
        ctx.strokeStyle = `rgba(224, 207, 199, ${depthAlpha * 0.45})`;
        ctx.lineWidth = 1.0;
      }

      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    });

    // Outer bounding wire frame sensors dots to mimic a gorgeous precision sensor hud
    ctx.fillStyle = colorAccent;
    ctx.beginPath();
    ctx.arc(pPoints[cabVertexOffset + 6].x, pPoints[cabVertexOffset + 6].y, 2, 0, Math.PI * 2); // cab front right top corner
    ctx.arc(pPoints[cabVertexOffset + 7].x, pPoints[cabVertexOffset + 7].y, 2, 0, Math.PI * 2); // cab front left top corner
    ctx.fill();

    // UI overlays on canvas matching premium scannable tracker
    ctx.fillStyle = '#8b7a70';
    ctx.font = '9px monospace';
    ctx.fillText(`ROT-Y: ${angleY.toFixed(2)} RAD`, 10, height - 10);
    ctx.fillText(`ROT-X: ${angleX.toFixed(2)} RAD`, 10, height - 22);
    ctx.fillText(`COMPLIANCE LEVEL: ${(cargoFilling * 100).toFixed(0)}%`, width - 140, height - 10);
  }, [angleX, angleY, angleZ, cargoFilling, colorAccent, width, height, size]);

  // Handle Dragging / Orbit controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    setIsDragging(true);
    mouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !interactive) return;
    const deltaX = e.clientX - mouseRef.current.x;
    const deltaY = e.clientY - mouseRef.current.y;
    
    setAngleY(prev => prev + deltaX * 0.008);
    setAngleX(prev => Math.max(-Math.PI / 3, Math.min(Math.PI / 3, prev + deltaY * 0.008)));
    
    mouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch triggers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!interactive || e.touches.length === 0) return;
    setIsDragging(true);
    mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !interactive || e.touches.length === 0) return;
    const deltaX = e.touches[0].clientX - mouseRef.current.x;
    const deltaY = e.touches[0].clientY - mouseRef.current.y;

    setAngleY(prev => prev + deltaX * 0.012);
    setAngleX(prev => Math.max(-Math.PI / 3, Math.min(Math.PI / 3, prev + deltaY * 0.012)));

    mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  return (
    <div className={`relative flex flex-col items-center bg-gradient-to-b from-[#1c1615] to-[#120e0d] border border-[#2e2321] rounded-2.5xl p-4 overflow-hidden select-none ${className}`}>
      
      {/* Absolute Header Ribbon */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[9px] font-mono font-bold tracking-wider text-[#b8a49c] uppercase">
            {statusLabel}
          </span>
        </div>
        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#ff5a1f]/10 text-[#ff7a4e] border border-[#ff5a1f]/15 font-mono font-black uppercase">
          Interactive HD Model
        </span>
      </div>

      <div className="cursor-grab active:cursor-grabbing w-full flex justify-center mt-3 relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUpOrLeave}
          className="block drop-shadow-[0_10px_35px_rgba(255,90,31,0.06)] scale-100 sm:scale-105"
        />
        
        {/* Helper Orbit Overlay Hint */}
        <div className="absolute bottom-5 text-[8px] font-mono text-[#8b7a70] uppercase tracking-widest pointer-events-none opacity-60">
          Drag horizontally or vertically to rotate 360°
        </div>
      </div>
    </div>
  );
}
