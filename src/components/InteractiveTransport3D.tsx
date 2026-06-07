import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Truck, Compass, Activity, ShieldAlert, Sliders, RefreshCw, Layers, 
  Sun, Moon, Zap, Play, Pause, Thermometer, Wind, AlertTriangle, Eye, HelpCircle
} from 'lucide-react';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface AtomInfo {
  pos: Vector3;
  color: string;
  size: number;
  label: string;
}

interface BondInfo {
  from: number;
  to: number;
}

export default function InteractiveTransport3D() {
  const tankerCanvasRef = useRef<HTMLCanvasElement>(null);
  const cargoCanvasRef = useRef<HTMLCanvasElement>(null);

  // Simulation parameters controlled in the UI
  const [speedVal, setSpeedVal] = useState(65); // KMH speed
  const [fluidLevel, setFluidLevel] = useState(72); // 0-100% filling
  const [chamberPressure, setChamberPressure] = useState(14.8); // PSI (safe is under 22)
  const [substance, setSubstance] = useState<'benzene' | 'ethylene' | 'butane'>('benzene');
  
  // Customization States
  const [isWireframe, setIsWireframe] = useState(false);
  const [themeMode, setThemeMode] = useState<'cyber' | 'stealth'>('cyber');
  const [isExplodedView, setIsExplodedView] = useState(false);
  const [colorScheme, setColorScheme] = useState<'#ff5a1f' | '#3b82f6' | '#10b981' | '#a855f7'>('#ff5a1f');
  const [rotateToggle, setRotateToggle] = useState(true);

  // Rotation angles for Tanker
  const [tRotY, setTRotY] = useState(0.45);
  const [tRotX, setTRotX] = useState(-0.15);
  const [tWheelAngle, setTWheelAngle] = useState(0);

  // Rotation angles for Molecular Cargo structure
  const [cRotY, setCRotY] = useState(0.8);
  const [cRotX, setCRotX] = useState(0.3);
  const [cRotZ, setCRotZ] = useState(0.1);

  // Interaction dragging states
  const [dragTarget, setDragTarget] = useState<'tanker' | 'cargo' | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Update wheel angles and automatic rotations
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Spin wheels proportionally to speed setting
      const wheelSpinspeed = (speedVal * 0.12) * delta;
      setTWheelAngle(prev => (prev + wheelSpinspeed) % (Math.PI * 2));

      // Auto rotation logic if toggled
      if (rotateToggle) {
        setTRotY(prev => (prev + 0.3 * delta) % (Math.PI * 2));
        setCRotY(prev => (prev + 0.5 * delta) % (Math.PI * 2));
        setCRotX(prev => (prev + 0.2 * delta) % (Math.PI * 2));
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [rotateToggle, speedVal]);

  // Handle Dragging
  const startDrag = (e: React.MouseEvent, target: 'tanker' | 'cargo') => {
    setDragTarget(target);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const onDrag = (e: React.MouseEvent) => {
    if (!dragTarget) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    if (dragTarget === 'tanker') {
      setTRotY(prev => prev + dx * 0.007);
      setTRotX(prev => Math.max(-Math.PI / 3, Math.min(Math.PI / 3, prev + dy * 0.007)));
    } else if (dragTarget === 'cargo') {
      setCRotY(prev => prev + dx * 0.007);
      setCRotX(prev => prev + dy * 0.007);
    }

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const endDrag = () => {
    setDragTarget(null);
  };

  // ----------------------------------------------------
  // DRAW TANKER MODEL ON CANVAS
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = tankerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background matching container theme
    ctx.clearRect(0, 0, w, h);
    
    // Add grid floor lines
    const isStealth = themeMode === 'stealth';
    const gridY = 0.5; // ground height position
    const groundProjY = h * 0.72;

    // Draw tech background grid overlay
    ctx.strokeStyle = isStealth ? 'rgba(48, 54, 61, 0.25)' : 'rgba(255, 90, 31, 0.04)';
    ctx.lineWidth = 0.5;
    for (let xOff = -4; xOff <= 4; xOff += 0.8) {
      // Perspective line tracing
      const zFar = 3.0;
      const zNear = -1.5;
      
      const projectGround = (gx: number, gz: number) => {
        // Rotate ground on theta angles
        const cosY = Math.cos(tRotY);
        const sinY = Math.sin(tRotY);
        let rx = gx * cosY - gz * sinY;
        let rz = gx * sinY + gz * cosY;

        let py2 = gridY * Math.cos(tRotX) - rz * Math.sin(tRotX);
        let pz2 = gridY * Math.sin(tRotX) + rz * Math.cos(tRotX);

        const sf = 4.0;
        const scale = sf / (pz2 + 6.0);
        return {
          x: w / 2 + rx * scale * (w * 0.45),
          y: h / 2 + py2 * scale * (h * 0.45)
        };
      };

      const pF = projectGround(xOff, 2.5);
      const pN = projectGround(xOff, -2.5);
      ctx.beginPath();
      ctx.moveTo(pF.x, pF.y);
      ctx.lineTo(pN.x, pN.y);
      ctx.stroke();

      const pLF = projectGround(-2.5, xOff);
      const pLN = projectGround(2.5, xOff);
      ctx.beginPath();
      ctx.moveTo(pLF.x, pLF.y);
      ctx.lineTo(pLN.x, pLN.y);
      ctx.stroke();
    }

    // Coordinates definition of the Tanker model with Exploded option
    // Shift whole tank module upwards if isExplodedView is true
    const explodedTankShift = isExplodedView ? -0.45 : 0;

    const vertices: Vector3[] = [];
    const lines: number[][] = [];

    // Anchor sections offset counters
    const tankerZLength = 2.6;
    const tankerZStart = -1.3;

    // 1. Tanker cylinder circles (Segments along Z-axis)
    const cylRadius = 0.52;
    const cylSlices = 7;
    const cylRotSteps = 10;
    const cylVertStart = vertices.length;

    for (let s = 0; s <= cylSlices; s++) {
      const z = tankerZStart + (s / cylSlices) * tankerZLength;
      for (let r = 0; r < cylRotSteps; r++) {
        const rad = (r / cylRotSteps) * Math.PI * 2;
        vertices.push({
          x: Math.cos(rad) * cylRadius,
          y: Math.sin(rad) * cylRadius - 0.12 + explodedTankShift, // cylinder is centered slightly above chassis
          z: z
        });
      }
    }

    // Cylindrical wire links
    for (let s = 0; s <= cylSlices; s++) {
      const sliceOffset = cylVertStart + s * cylRotSteps;
      for (let r = 0; r < cylRotSteps; r++) {
        const nextR = (r + 1) % cylRotSteps;
        lines.push([sliceOffset + r, sliceOffset + nextR]);
        if (s < cylSlices) {
          lines.push([sliceOffset + r, sliceOffset + cylRotSteps + r]);
        }
      }
    }

    // 2. Chassis Lower Bed Box
    const chassisVertStart = vertices.length;
    const chY = 0.28;
    const chW = 0.42;
    const chStart = -1.45;
    const chEnd = 1.45;

    vertices.push(
      { x: -chW, y: chY, z: chStart }, // 0: BLB
      { x: chW, y: chY, z: chStart },  // 1: BRB
      { x: chW, y: chY - 0.06, z: chStart }, // 2: BRT
      { x: -chW, y: chY - 0.06, z: chStart }, // 3: BLT
      
      { x: -chW, y: chY, z: chEnd }, // 4: FLB
      { x: chW, y: chY, z: chEnd },  // 5: FRB
      { x: chW, y: chY - 0.06, z: chEnd }, // 6: FRT
      { x: -chW, y: chY - 0.06, z: chEnd }  // 7: FLT
    );

    // Chassis wire skeleton connection indices
    const chWires = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    chWires.forEach(([a, b]) => {
      lines.push([chassisVertStart + a, chassisVertStart + b]);
    });

    // 3. Front Cabin Box (Chassis z = 0.9 to 1.5)
    const cabVertStart = vertices.length;
    const cabH = 0.52; // Taller
    const cabW = 0.44;
    const cabZStart = 0.85;
    const cabZEnd = 1.48;

    vertices.push(
      { x: -cabW, y: chY - 0.02, z: cabZStart }, // 0: BLB
      { x: cabW, y: chY - 0.02, z: cabZStart },  // 1: BRB
      { x: cabW, y: chY - cabH, z: cabZStart }, // 2: BRT
      { x: -cabW, y: chY - cabH, z: cabZStart }, // 3: BLT
      
      { x: -cabW, y: chY - 0.02, z: cabZEnd },  // 4: FLB
      { x: cabW, y: chY - 0.02, z: cabZEnd },   // 5: FRB
      { x: cabW, y: chY - cabH + 0.12, z: cabZEnd }, // 6: FRT Windshield Slant
      { x: -cabW, y: chY - cabH + 0.12, z: cabZEnd }  // 7: FLT Windshield Slant
    );

    // Cabin links
    const cabWires = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    cabWires.forEach(([a, b]) => {
      lines.push([cabVertStart + a, cabVertStart + b]);
    });

    // Windshield frame lines
    lines.push([cabVertStart + 2, cabVertStart + 6]);
    lines.push([cabVertStart + 3, cabVertStart + 7]);

    // 4. Wheels with Spinning axle representations (3 pairs of wheels)
    const wheelRadius = 0.21;
    const wheelAxlePositions = [
      { z: -1.0, x: 0.44 },
      { z: -0.52, x: 0.44 },
      { z: 1.15, x: 0.44 }
    ];

    const generateWheels = () => {
      wheelAxlePositions.forEach((axle, index) => {
        const sideOffsets = [-1, 1]; // Left and Right wheels
        sideOffsets.forEach(side => {
          const baseIdx = vertices.length;
          const numWheelPoints = 6;
          const wWidth = 0.12;

          // Outer wheels
          const cx = side * (axle.x + wWidth);
          const cy = chY + 0.14;

          for (let p = 0; p < numWheelPoints; p++) {
            // Apply spin rotation angle based on state
            const ang = (p / numWheelPoints) * Math.PI * 2 + tWheelAngle;
            // Draw circle vertex
            vertices.push({
              x: cx,
              y: cy + Math.sin(ang) * wheelRadius,
              z: axle.z + Math.cos(ang) * wheelRadius
            });
            // Thick width vertex
            vertices.push({
              x: cx + side * wWidth,
              y: cy + Math.sin(ang) * wheelRadius,
              z: axle.z + Math.cos(ang) * wheelRadius
            });
          }

          // Join circular steps and draw spokes!
          for (let p = 0; p < numWheelPoints; p++) {
            const nextP = (p + 1) % numWheelPoints;
            lines.push([baseIdx + p * 2, baseIdx + nextP * 2]);
            lines.push([baseIdx + p * 2 + 1, baseIdx + nextP * 2 + 1]);
            lines.push([baseIdx + p * 2, baseIdx + p * 2 + 1]);
            
            // Add a dynamic wire spoke line to showcase the spinning!
            if (p % 2 === 0) {
              // Add wheel hub center coordinate
              const hubIdx = vertices.length;
              vertices.push({ x: cx + (side * wWidth) / 2, y: cy, z: axle.z });
              lines.push([baseIdx + p * 2, hubIdx]);
            }
          }
        });
      });
    };

    generateWheels();

    // ----------------------------------------------------
    // PROJECT & DRAW THE TANKER OBJECTS
    // ----------------------------------------------------
    const project = (v: Vector3) => {
      // 3D rotation computation of coordinates
      // Y-orbit
      const cosY = Math.cos(tRotY);
      const sinY = Math.sin(tRotY);
      let x1 = v.x * cosY - v.z * sinY;
      let z1 = v.x * sinY + v.z * cosY;

      // X-pitch elevation
      const cosX = Math.cos(tRotX);
      const sinX = Math.sin(tRotX);
      let y2 = v.y * cosX - z1 * sinX;
      let z2 = v.y * sinX + z1 * cosX;

      // Projection scalars
      const cameraDepth = 4.6;
      const fovMultiplier = 4.2;
      const perspectiveScale = fovMultiplier / (z2 + cameraDepth);

      const px = w / 2 + x1 * perspectiveScale * (w * 0.44);
      const py = h / 2.15 + y2 * perspectiveScale * (h * 0.44);
      
      return { x: px, y: py, z: z2 };
    };

    const projectedPoints = vertices.map(v => project(v));

    // Fill cargo tank substance polygon if we are in solid rendering mode (or X-ray mode)
    if (fluidLevel > 0) {
      ctx.fillStyle = `${colorScheme}15`; // translucent fill matching current theme color
      ctx.beginPath();
      
      // Let's draw a glowing chemical fluid block inside the tank slices
      const slicesCount = Math.ceil((cylSlices * fluidLevel) / 100);
      const fillingHeightMap = (1 - (fluidLevel / 100)) * cylRadius * 2 - cylRadius;

      // Lower radial steps list
      for (let s = 0; s <= slicesCount; s++) {
        const sliceOffset = cylVertStart + s * cylRotSteps;
        // Grab lower points
        for (let r = 2; r <= 8; r++) {
          const idx = sliceOffset + (r % cylRotSteps);
          const pt = projectedPoints[idx];
          if (s === 0 && r === 2) {
            ctx.moveTo(pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
      }
      ctx.closePath();
      ctx.fill();
    }

    // Now draw all projected wireframe lines
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    lines.forEach(([iA, iB]) => {
      const pA = projectedPoints[iA];
      const pB = projectedPoints[iB];
      if (!pA || !pB) return;

      // Depth attenuation based on average Z of the two points
      const avgZ = (pA.z + pB.z) / 2;
      const fade = Math.max(0.18, Math.min(1.0, 1.8 - (avgZ + 0.4)));

      // Colors: Tank uses color scheme, cab/wheels use gray/off-white tints
      const isTankPart = iA < chassisVertStart;
      const isWheelPart = iA >= cabVertStart + 8; // past cabin is wheels

      if (isWireframe) {
        if (isTankPart) {
          ctx.strokeStyle = `${colorScheme}${Math.floor(fade * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 0.9;
        } else if (isWheelPart) {
          ctx.strokeStyle = `rgba(139, 148, 158, ${fade * 0.35})`;
          ctx.lineWidth = 0.5;
        } else {
          ctx.strokeStyle = `rgba(177, 186, 196, ${fade * 0.65})`;
          ctx.lineWidth = 0.7;
        }
      } else {
        // Futuristic solid look uses thicker accents
        if (isTankPart) {
          ctx.strokeStyle = `${colorScheme}${Math.floor(fade * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1.4;
        } else if (isWheelPart) {
          ctx.strokeStyle = `rgba(139, 148, 158, ${fade * 0.6})`;
          ctx.lineWidth = 0.8;
        } else {
          ctx.strokeStyle = `rgba(224, 230, 237, ${fade * 0.75})`;
          ctx.lineWidth = 1.1;
        }
      }

      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    });

    // Draw auxiliary laser beam indicator under front bumper (hazard projection sensor!)
    const frontCabinLeftBumper = projectedPoints[cabVertStart + 4];
    const frontCabinRightBumper = projectedPoints[cabVertStart + 5];
    if (frontCabinLeftBumper && frontCabinRightBumper) {
      ctx.strokeStyle = `${colorScheme}35`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(frontCabinLeftBumper.x, frontCabinLeftBumper.y);
      ctx.lineTo(frontCabinLeftBumper.x, frontCabinLeftBumper.y + h * 0.08);
      ctx.moveTo(frontCabinRightBumper.x, frontCabinRightBumper.y);
      ctx.lineTo(frontCabinRightBumper.x, frontCabinRightBumper.y + h * 0.08);
      ctx.stroke();
    }

  }, [tRotX, tRotY, tWheelAngle, fluidLevel, colorScheme, themeMode, isWireframe, isExplodedView, speedVal]);

  // ----------------------------------------------------
  // DRAW ATOMIC MOLECULAR CARGO AND FUEL DEPOT
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = cargoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Get Atom Nodes based on selected substances
    // 3D local offset coordinates
    let atoms: AtomInfo[] = [];
    let bonds: BondInfo[] = [];

    if (substance === 'benzene') {
      // Benzene hexagon ring C6H6
      const rCarbon = 0.64;
      const rHydrogen = 0.96;
      
      // Carbon Ring (grey/green)
      for (let i = 0; i < 6; i++) {
        const theta = (i / 6) * Math.PI * 2;
        atoms.push({
          pos: { x: Math.cos(theta) * rCarbon, y: Math.sin(theta) * rCarbon, z: 0 },
          color: '#30363d',
          size: 7,
          label: 'C'
        });
        
        // Hydrogen nodes (cyan/white)
        atoms.push({
          pos: { x: Math.cos(theta) * rHydrogen, y: Math.sin(theta) * rHydrogen, z: 0 },
          color: '#3b82f6',
          size: 4,
          label: 'H'
        });
      }

      // Ring bonds
      for (let i = 0; i < 6; i++) {
        const nextCarbon = (i + 1) % 6;
        bonds.push({ from: i * 2, to: nextCarbon * 2 }); // C-C bond
        bonds.push({ from: i * 2, to: i * 2 + 1 }); // C-H bond

        // Alternate double bonding for Benzene ring structure
        if (i % 2 === 0) {
          // Double bond offset line representation
          bonds.push({ from: i * 2, to: nextCarbon * 2 });
        }
      }
    } else if (substance === 'ethylene') {
      // Ethylene C2H4 (double bonded carbon center)
      atoms = [
        { pos: { x: -0.32, y: 0, z: 0 }, color: '#30363d', size: 8, label: 'C' },
        { pos: { x: 0.32, y: 0, z: 0 }, color: '#30363d', size: 8, label: 'C' },
        
        { pos: { x: -0.75, y: -0.42, z: 0.2 }, color: '#3b82f6', size: 4.5, label: 'H' },
        { pos: { x: -0.75, y: 0.42, z: -0.2 }, color: '#3b82f6', size: 4.5, label: 'H' },
        { pos: { x: 0.75, y: -0.42, z: -0.2 }, color: '#3b82f6', size: 4.5, label: 'H' },
        { pos: { x: 0.75, y: 0.42, z: 0.2 }, color: '#3b82f6', size: 4.5, label: 'H' },
      ];

      bonds = [
        { from: 0, to: 1 }, // Double Carbon Center
        { from: 0, to: 1 }, // Second line double covalent
        { from: 0, to: 2 }, { from: 0, to: 3 },
        { from: 1, to: 4 }, { from: 1, to: 5 }
      ];
    } else {
      // Liquid Butane C4H10 (simple organic tetrahedral zigzag)
      atoms = [
        { pos: { x: -0.75, y: -0.15, z: -0.1 }, color: '#30363d', size: 7.5, label: 'C' },
        { pos: { x: -0.25, y: 0.22, z: 0.1 }, color: '#30363d', size: 7.5, label: 'C' },
        { pos: { x: 0.25, y: -0.15, z: -0.1 }, color: '#30363d', size: 7.5, label: 'C' },
        { pos: { x: 0.75, y: 0.22, z: 0.1 }, color: '#30363d', size: 7.5, label: 'C' },

        // Hydrogens along the skeleton
        { pos: { x: -1.15, y: -0.15, z: -0.2 }, color: '#10b981', size: 4, label: 'H' },
        { pos: { x: -0.75, y: -0.6, z: 0.2 }, color: '#10b981', size: 4, label: 'H' },
        { pos: { x: -0.75, y: 0.2, z: -0.6 }, color: '#10b981', size: 4, label: 'H' },

        { pos: { x: -0.25, y: 0.65, z: -0.3 }, color: '#10b981', size: 4, label: 'H' },
        { pos: { x: -0.25, y: -0.2, z: 0.6 }, color: '#10b981', size: 4, label: 'H' },

        { pos: { x: 0.25, y: -0.6, z: -0.5 }, color: '#10b981', size: 4, label: 'H' },
        { pos: { x: 0.25, y: 0.22, z: 0.5 }, color: '#10b981', size: 4, label: 'H' },

        { pos: { x: 1.15, y: 0.22, z: 0.2 }, color: '#10b981', size: 4, label: 'H' },
        { pos: { x: 0.75, y: -0.2, z: 0.5 }, color: '#10b981', size: 4, label: 'H' },
        { pos: { x: 0.75, y: 0.65, z: -0.3 }, color: '#10b981', size: 4, label: 'H' }
      ];

      bonds = [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, // C-C spine
        { from: 0, to: 4 }, { from: 0, to: 5 }, { from: 0, to: 6 },
        { from: 1, to: 7 }, { from: 1, to: 8 },
        { from: 2, to: 9 }, { from: 2, to: 10 },
        { from: 3, to: 11 }, { from: 3, to: 12 }, { from: 3, to: 13 }
      ];
    }

    // Dynamic 3D Matrix Rotator
    const projectAtom = (atom: AtomInfo) => {
      const v = atom.pos;

      // Rotate Y Euler
      const cosY = Math.cos(cRotY);
      const sinY = Math.sin(cRotY);
      let x1 = v.x * cosY - v.z * sinY;
      let z1 = v.x * sinY + v.z * cosY;

      // Rotate X Euler
      const cosX = Math.cos(cRotX);
      const sinX = Math.sin(cRotX);
      let y2 = v.y * cosX - z1 * sinX;
      let z2 = v.y * sinX + z1 * cosX;

      // Rotate Z Euler
      const cosZ = Math.cos(cRotZ);
      const sinZ = Math.sin(cRotZ);
      let x3 = x1 * cosZ - y2 * sinZ;
      let y3 = x1 * sinZ + y2 * cosZ;

      const scale = 3.6 / (z2 + 4.2);
      const px = w / 2 + x3 * scale * (w * 0.4);
      const py = h / 2.15 - y3 * scale * (h * 0.4);
      return { x: px, y: py, z: z2, base: atom };
    };

    const pAtoms = atoms.map(projectAtom);

    // Draw Bonds as 3D lines
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    bonds.forEach(bond => {
      const a1 = pAtoms[bond.from];
      const a2 = pAtoms[bond.to];
      if (!a1 || !a2) return;

      const avgZ = (a1.z + a2.z) / 2;
      const opacity = Math.max(0.2, Math.min(1.0, 1.4 - (avgZ + 0.3)));

      ctx.strokeStyle = `rgba(139, 148, 158, ${opacity * 0.75})`;
      ctx.beginPath();
      ctx.moveTo(a1.x, a1.y);
      ctx.lineTo(a2.x, a2.y);
      ctx.stroke();
    });

    // Draw Atoms as spheres in z-sorted order so foreground renders on top correctly
    const zSortedAtoms = [...pAtoms].sort((a, b) => b.z - a.z);

    zSortedAtoms.forEach(atom => {
      const avgZ = atom.z;
      const opacity = Math.max(0.3, Math.min(1.0, 1.4 - (avgZ + 0.3)));
      
      ctx.fillStyle = atom.base.color;
      ctx.beginPath();
      
      // Calculate dynamic radius scaling on depth
      const sizeMultiplier = 3.2 / (avgZ + 4.0);
      const dynamicRadius = Math.max(2, atom.base.size * sizeMultiplier);
      
      ctx.arc(atom.x, atom.y, dynamicRadius, 0, Math.PI * 2);
      ctx.fill();

      // Add border ring lines to atomic node spheres
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.4})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Carbon labeling
      if (atom.base.label === 'C' && dynamicRadius > 4.5) {
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C', atom.x, atom.y);
      }
    });

    // Render title of active substance inside the panel
    ctx.fillStyle = '#8b949e';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SUBSTANCE: ${substance.toUpperCase()}`, 10, h - 10);
    ctx.fillText(`CARBON MASS COVALENT INDEX: G-26`, 10, h - 22);

  }, [cRotX, cRotY, cRotZ, substance]);

  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-3xl overflow-hidden leading-snug">
      
      {/* 3D PANEL GLOW BAR */}
      <div className="h-[2px] bg-gradient-to-r from-blue-500 via-[#ff5a1f] to-emerald-500" />
      
      {/* HEADER BAR */}
      <div className="p-5 border-b border-[#30363d] bg-[#161b22] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#ff5a1f]/10 text-[#ff5a1f] border border-[#ff5a1f]/15">
            <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-tight font-sans">
                Real-Time 3D Fleet Transport & Molecular Cockpit
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest animate-pulse">
                Interactive OpenGL Engine
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] font-sans mt-0.5">
              Simulate tanker aerodynamics, liquid volume pressure gauges, and molecular covalent cargo structures below terminal control maps.
            </p>
          </div>
        </div>

        {/* ROTATE TOGGLE SWITCH */}
        <button
          type="button"
          onClick={() => setRotateToggle(!rotateToggle)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border transition-all cursor-pointer ${
            rotateToggle 
              ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/25 hover:bg-[#10b981]/20' 
              : 'bg-[#ff5a1f]/10 text-[#ff7a4e] border-[#ff5a1f]/25 hover:bg-[#ff5a1f]/20'
          }`}
        >
          {rotateToggle ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          <span>{rotateToggle ? 'AUTO SPIN ACTIVE' : 'AXIS ORBIT BOUND'}</span>
        </button>
      </div>

      {/* CORE VIEWPORTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-[#30363d]">
        
        {/* VIEWPORT 1: 3D TANKER BODY (COSMIC SCALE) */}
        <div className="lg:col-span-8 p-5 flex flex-col bg-[#090b10] border-r border-[#30363d] relative overflow-hidden select-none">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            <span className="text-[9px] font-mono font-black text-gray-400 tracking-wider">
              VIEWPORT F-01: CHEMICAL SHIPMENT TRANSPORT SHIP
            </span>
          </div>

          <div 
            onMouseDown={(e) => startDrag(e, 'tanker')}
            onMouseMove={onDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            className="cursor-grab active:cursor-grabbing flex justify-center items-center h-[340px] relative rounded-2xl bg-[#090b11] border border-[#21262d]/50 shadow-inner group"
          >
            <canvas
              ref={tankerCanvasRef}
              width={540}
              height={330}
              className="max-w-full drop-shadow-[0_20px_40px_rgba(255,90,31,0.08)] group-hover:scale-[1.01] transition-transform duration-300 pointer-events-none"
            />
            
            {/* Viewport UI gauges corners */}
            <div className="absolute top-4 right-4 bg-[#161b22]/90 border border-[#30363d] px-2 py-1.5 rounded-lg text-left">
              <span className="block text-[8px] text-[#8b949e] font-mono leading-none font-bold uppercase">
                G-SENSOR FORCE:
              </span>
              <span className="text-xs font-mono font-extrabold text-white">
                {(speedVal * 0.015 + 0.15).toFixed(2)} G
              </span>
            </div>

            <div className="absolute bottom-4 left-4 flex gap-1.5 font-mono text-[8.5px] text-[#8b949e]">
              <span className="bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">
                θ-Yaw: {tRotY.toFixed(2)} rad
              </span>
              <span className="bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">
                Φ-Pitch: {tRotX.toFixed(2)} rad
              </span>
            </div>

            <div className="absolute bottom-4 right-4 text-[9px] font-mono font-bold text-[#8b949e]">
              Drag inside frame to rotate 360°
            </div>
          </div>
        </div>

        {/* VIEWPORT 2: CARGO MOLECULAR CODE & WIDGET */}
        <div className="lg:col-span-4 p-5 flex flex-col bg-[#0b0d13] relative overflow-hidden select-none justify-between">
          <div>
            <div className="flex items-center justify-between mb-4.5">
              <span className="text-[9px] font-mono font-black text-gray-400 tracking-wider">
                VIEWPORT F-02: CHEMICAL CARGO MOLECULE
              </span>
              <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                LATTICE PREVIEW
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#161b22] border border-[#30363d] rounded-xl mb-4 text-xs">
              {[
                { id: 'benzene', label: 'C6H6 Benzene' },
                { id: 'ethylene', label: 'C2H4 Ethylene' },
                { id: 'butane', label: 'C4H10 Butane' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSubstance(sub.id as any)}
                  className={`py-1.5 font-mono font-extrabold rounded-lg transition-all text-[10px] cursor-pointer ${
                    substance === sub.id 
                      ? 'bg-[#ff5a1f] text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <div
              onMouseDown={(e) => startDrag(e, 'cargo')}
              onMouseMove={onDrag}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
              className="cursor-grab active:cursor-grabbing flex items-center justify-center h-[210px] rounded-2xl bg-[#090b11] border border-[#21262d]/50 relative shadow-inner overflow-hidden"
            >
              <canvas
                ref={cargoCanvasRef}
                width={280}
                height={200}
                className="max-w-full pointer-events-none drop-shadow-[0_12px_24px_rgba(59,130,246,0.06)]"
              />
              <div className="absolute top-3 left-3 flex gap-1 p-1 bg-black/40 rounded border border-white/[0.04] text-[8px] font-mono text-gray-400">
                <span>STABLE COVALENT ENERGY</span>
              </div>
            </div>
          </div>

          {/* DYNAMIC PRESSURE WARNING WIDGETS */}
          <div className="mt-4 p-3 bg-gradient-to-r from-amber-500/5 to-amber-600/0 border border-amber-500/10 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-left">
              <span className="block text-[8px] font-mono uppercase font-black text-amber-400">
                BS-VI ECO-COMPLIANCE MONITOR
              </span>
              <p className="text-[10.5px] text-[#8b949e] leading-snug">
                {substance === 'benzene' && "Benzene carrying requires high-integrity gaskets and strict thermal vapor safety caps."}
                {substance === 'ethylene' && "Ethylene carrying requires strict pressure regulation to prevent micro-bubbles."}
                {substance === 'butane' && "Liquified Butane gas requires persistent pressure telemetry checks below 24.5 PSI."}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER PARAMETERS SLIDERS CONTROL */}
      <div className="p-6 bg-[#161b22] grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
        
        {/* SLIDER 1: VELOCITY CRUISE SPEED */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8b949e] font-sans font-medium flex items-center gap-1.5 select-none">
              <Zap className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
              Velocity Cruise speed
            </span>
            <span className="font-mono text-white font-extrabold">{speedVal} KM/H</span>
          </div>
          <input
            type="range"
            min="0"
            max="120"
            value={speedVal}
            onChange={(e) => setSpeedVal(Number(e.target.value))}
            className="w-full h-1.5 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-[#ff5a1f]"
          />
          <span className="block text-[9px] font-mono text-gray-500">
            Current Wheel Spin: {(speedVal * 0.1).toFixed(1)} rad/s
          </span>
        </div>

        {/* SLIDER 2: LIQUID VOLUME TANK FILLING */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8b949e] font-sans font-medium flex items-center gap-1.5 select-none">
              <Activity className="w-3.5 h-3.5 text-[#ff5a1f]" />
              Fluid payload filling
            </span>
            <span className="font-mono text-white font-extrabold">{fluidLevel}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={fluidLevel}
            onChange={(e) => setFluidLevel(Number(e.target.value))}
            className="w-full h-1.5 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-[#ff5a1f]"
          />
          <span className="block text-[9px] font-mono text-gray-500">
            Net Weight: {(fluidLevel * 0.25).toFixed(1)} Metric Tons
          </span>
        </div>

        {/* SLIDER 3: PRESSURE CHAMBER SENSOR */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8b949e] font-sans font-medium flex items-center gap-1.5 select-none">
              <Thermometer className="w-3.5 h-3.5 text-blue-400" />
              Internal pressure
            </span>
            <span className={`font-mono font-extrabold ${chamberPressure > 20 ? 'text-red-500' : 'text-white'}`}>
              {chamberPressure.toFixed(1)} PSI
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="0.1"
            value={chamberPressure}
            onChange={(e) => setChamberPressure(Number(e.target.value))}
            className="w-full h-1.5 bg-[#21262d] rounded-lg appearance-none cursor-pointer accent-[#ff5a1f]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-gray-500">
              Chamber Heat: {(chamberPressure * 2.8).toFixed(0)} °C
            </span>
            {chamberPressure > 22 && (
              <span className="text-[8px] font-mono font-black text-red-500 uppercase tracking-widest animate-pulse">
                ★ OUT OF LIMIT
              </span>
            )}
          </div>
        </div>

        {/* COCKPIT SELECTORS (WIREFRAME, THEMES, EXPLODED) */}
        <div className="space-y-2">
          <span className="text-[#8b949e] text-xs font-sans font-medium block select-none">
            3D Display options
          </span>
          <div className="grid grid-cols-3 gap-1 px-1 bg-[#0d1117] border border-[#30363d] rounded-xl text-[9px] py-1">
            <button
              onClick={() => setIsWireframe(!isWireframe)}
              className={`py-1.5 rounded font-mono font-extrabold transition-all cursor-pointer ${
                isWireframe ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              WIREFRAME
            </button>
            <button
              onClick={() => setIsExplodedView(!isExplodedView)}
              className={`py-1.5 rounded font-mono font-extrabold transition-all cursor-pointer ${
                isExplodedView ? 'bg-purple-500/10 text-purple-400' : 'text-gray-400 hover:text-white'
              }`}
              title="Lift tank above chassis to examine linkages"
            >
              EXPLODED
            </button>
            <button
              onClick={() => {
                // cycle through colors
                const palette: any = ['#ff5a1f', '#3b82f6', '#10b981', '#a855f7'];
                const idx = palette.indexOf(colorScheme);
                const nextIdx = (idx + 1) % palette.length;
                setColorScheme(palette[nextIdx]);
              }}
              style={{ color: colorScheme }}
              className="py-1.5 rounded font-mono font-extrabold hover:bg-white/[0.03] transition-all cursor-pointer"
            >
              HUE COLOR
            </button>
          </div>
          <span className="block text-[8px] font-mono text-gray-500 text-right uppercase">
            ACTIVE SYSTEM: PERSISTENT BUFFER
          </span>
        </div>

      </div>

    </div>
  );
}
