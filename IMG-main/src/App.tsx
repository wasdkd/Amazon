import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Text, MeshDistortMaterial, MeshWobbleMaterial, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  RotateCcw, 
  Settings2, 
  Box, 
  Circle, 
  Triangle, 
  LayoutGrid, 
  GalleryVertical,
  Fullscreen,
  Zap,
  Image as ImageIcon,
  Heart,
  Star,
  Monitor
} from 'lucide-react';

// --- Types ---
type DisplayMode = 'cube' | 'pyramid' | 'sphere' | 'carousel' | 'bento' | 'diamond';

interface PhotoItem {
  id: string;
  url: string;
  aspectRatio: number;
}

// --- 3D Components ---

/**
 * A simple plane that displays an image, facing the camera.
 */
function ImagePlane({ url, position, rotation, scale = [1, 1, 1], index }: { url: string, position: [number, number, number], rotation?: [number, number, number], scale?: [number, number, number], index: number }) {
  const texture = useLoader(url);
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent opacity={0.95} />
    </mesh>
  );
}

// Helper to load textures
function useLoader(url: string) {
  const texture = useRef<THREE.Texture | null>(null);
  if (!texture.current) {
    texture.current = new THREE.TextureLoader().load(url);
    texture.current.anisotropy = 16; // Keep it high fidelity
  }
  return texture.current;
}

/**
 * A face-mapped polyhedral component.
 * It takes a base geometry and maps photos to each individual face.
 */
function MultiFaceGeometry({ photos, geometry, scale = 1, rotationSpeed }: { photos: PhotoItem[], geometry: THREE.BufferGeometry, scale?: number, rotationSpeed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Extract face information
  const faces = useMemo(() => {
    const posAttr = geometry.getAttribute('position');
    const faceData: { center: THREE.Vector3, normal: THREE.Vector3, vertices: THREE.Vector3[] }[] = [];
    
    for (let i = 0; i < posAttr.count; i += 3) {
      const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      const v2 = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1);
      const v3 = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2);
      
      const center = new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3);
      const normal = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(v2, v1),
        new THREE.Vector3().subVectors(v3, v1)
      ).normalize();
      
      faceData.push({ center, normal, vertices: [v1, v2, v3] });
    }
    return faceData;
  }, [geometry]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed * 0.5;
      groupRef.current.rotation.x += delta * (rotationSpeed * 0.2);
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      {faces.map((face, i) => {
        const photo = photos[i % photos.length];
        return (
          <IndividualFace 
            key={i} 
            vertices={face.vertices} 
            center={face.center} 
            normal={face.normal} 
            url={photo.url} 
          />
        );
      })}
    </group>
  );
}

/**
 * Individual triangle face with high-fidelity texture mapping.
 */
function IndividualFace({ vertices, center, normal, url }: { vertices: THREE.Vector3[], center: THREE.Vector3, normal: THREE.Vector3, url: string }) {
  const texture = useLoader(url);
  
  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
  }
  
  const triangleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(9);
    // Project UVs onto the triangle
    const uvs = new Float32Array([0.5, 1, 0, 0, 1, 0]); 
    
    vertices[0].toArray(positions, 0);
    vertices[1].toArray(positions, 3);
    vertices[2].toArray(positions, 6);
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    return geo;
  }, [vertices]);

  return (
    <mesh geometry={triangleGeo}>
      <meshStandardMaterial 
        map={texture} 
        side={THREE.FrontSide} // Fixed: Prevents seeing through the shape
        metalness={0.1} 
        roughness={0.8}
        emissive="#000000"
        emissiveIntensity={0}
      />
    </mesh>
  );
}

/**
 * Advanced Football/Sphere Mode (Icosahedron)
 */
function FootballSphere({ photos, rotationSpeed }: { photos: PhotoItem[], rotationSpeed: number }) {
  // Faces: 0->20, 1->80, 2->320, 3->1280
  const detail = photos.length > 80 ? 2 : (photos.length > 20 ? 1 : 0);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(7, detail), [detail]);
  
  return <MultiFaceGeometry photos={photos} geometry={geo} rotationSpeed={rotationSpeed} />;
}

/**
 * Crystal Dodecahedron Mode
 */
function DodecahedronMode({ photos, rotationSpeed }: { photos: PhotoItem[], rotationSpeed: number }) {
  const geo = useMemo(() => new THREE.DodecahedronGeometry(7, 0), []);
  return <MultiFaceGeometry photos={photos} geometry={geo} rotationSpeed={rotationSpeed} />;
}

/**
 * Face-mapped Cube - Optimized for square photos and non-transparency
 */
function PhotoCube({ photos, rotationSpeed }: { photos: PhotoItem[], rotationSpeed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const size = 3.5;
  
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
      groupRef.current.rotation.x += delta * (rotationSpeed * 0.4);
    }
  });

  const faces = [
    { pos: [0, 0, size], rot: [0, 0, 0] },
    { pos: [0, 0, -size], rot: [0, Math.PI, 0] },
    { pos: [size, 0, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [-size, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [0, size, 0], rot: [-Math.PI / 2, 0, 0] },
    { pos: [0, -size, 0], rot: [Math.PI / 2, 0, 0] },
  ];

  return (
    <group ref={groupRef}>
      {faces.map((f, i) => {
        const photo = photos[i % photos.length];
        return (
          <mesh key={i} position={f.pos as any} rotation={f.rot as any}>
            <planeGeometry args={[size * 2, size * 2]} />
            <meshStandardMaterial 
              map={useLoader(photo.url)} 
              side={THREE.FrontSide}
              metalness={0.1}
              roughness={0.8}
            />
          </mesh>
        );
      })}
      <mesh>
        <boxGeometry args={[size * 1.99, size * 1.99, size * 1.99]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  );
}

function PhotoCarousel({ photos, rotationSpeed }: { photos: PhotoItem[], rotationSpeed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const radius = 8;

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      {photos.map((p, i) => {
        const angle = (i / photos.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <ImagePlane 
            key={p.id} 
            url={p.url} 
            position={[x, 0, z]} 
            rotation={[0, -angle + Math.PI / 2, 0]} 
            index={i}
            scale={[p.aspectRatio > 1 ? 4 : 3, p.aspectRatio < 1 ? 4 : 3, 1]}
          />
        );
      })}
    </group>
  );
}

/**
 * Bento Grid (3D floating planes) - Optimized for 5 columns and mobile slide
 */
function PhotoBento({ photos, rotationSpeed }: { photos: PhotoItem[], rotationSpeed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const cols = 5;
  const spacing = 3.2;
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {photos.map((p, i) => {
        const x = (i % cols) * spacing - ((cols - 1) * spacing) / 2;
        const y = Math.floor(i / cols) * -spacing + (Math.ceil(photos.length / cols) * spacing) / 4;
        const z = Math.sin(i + Date.now() * 0.0005) * 0.2;
        return (
          <Float key={p.id} speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
            <ImagePlane 
              url={p.url} 
              position={[x, y, z]} 
              index={i}
              scale={[p.aspectRatio > 1 ? 3 : 2.2, p.aspectRatio < 1 ? 3 : 2.2, 1]}
            />
          </Float>
        );
      })}
    </group>
  );
}


// --- Main App Component ---

export default function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [mode, setMode] = useState<DisplayMode>('cube');
  const [rotationSpeed, setRotationSpeed] = useState(0.5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCaptureScreenshot = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.setAttribute('download', `lumina-view-${mode}-${Date.now()}.png`);
    link.setAttribute('href', canvasRef.current.toDataURL('image/png').replace('image/png', 'image/octet-stream'));
    link.click();
  }, [mode]);

  const handleRecordVideo = useCallback(async () => {
    if (!canvasRef.current || isRecording) return;
    
    setIsRecording(true);
    const stream = canvasRef.current.captureStream(60);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lumina-motion-${mode}-${Date.now()}.webm`;
      link.click();
      setIsRecording(false);
    };

    recorder.start();
    // Record for 5 seconds (one full cycle roughly)
    setTimeout(() => recorder.stop(), 5000);
  }, [isRecording, mode]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          setPhotos(prev => [...prev, { 
            id: Math.random().toString(36).substr(2, 9), 
            url,
            aspectRatio: img.width / img.height
          }]);
        };
        img.src = url;
      });
    }
  };

  const clearPhotos = () => {
    photos.forEach(p => URL.revokeObjectURL(p.url));
    setPhotos([]);
  };

  return (
    <div className={`relative w-full h-screen bg-[#020205] text-slate-200 font-sans overflow-hidden select-none transition-all duration-700 ${isExportMode ? 'cursor-none' : ''}`}>
      {/* Ambient Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-900/20 blur-[150px] rounded-full z-0 pointer-events-none"></div>

      {/* 3D Scene */}
      <div className={`absolute inset-0 z-10 transition-all duration-1000 ${isFullscreen || isExportMode ? 'scale-100' : 'scale-95 translate-x-20'}`}>
        <Canvas 
          ref={canvasRef}
          shadows 
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        >
          <PerspectiveCamera makeDefault position={[0, 0, isExportMode ? 12 : 15]} fov={50} />
          
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
          <spotLight position={[-10, 20, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
          
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={4} 
            maxDistance={30}
            autoRotate={isExportMode}
            autoRotateSpeed={rotationSpeed * 2}
          />

          <AnimatePresence mode="wait">
            {photos.length > 0 ? (
              <group key={mode}>
                {mode === 'cube' && <PhotoCube photos={photos} rotationSpeed={rotationSpeed} />}
                {mode === 'pyramid' && <MultiFaceGeometry photos={photos} geometry={new THREE.TetrahedronGeometry(7, 0)} rotationSpeed={rotationSpeed} />}
                {mode === 'sphere' && <FootballSphere photos={photos} rotationSpeed={rotationSpeed} />}
                {mode === 'carousel' && <PhotoCarousel photos={photos} rotationSpeed={rotationSpeed} />}
                {mode === 'bento' && <PhotoBento photos={photos} rotationSpeed={rotationSpeed} />}
                {mode === 'diamond' && <DodecahedronMode photos={photos} rotationSpeed={rotationSpeed} />}
                
                <ContactShadows position={[0, -8, 0]} opacity={0.2} scale={40} blur={2} far={10} color="#000" />
              </group>
            ) : (
              <group>
                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                  <Text
                    fontSize={0.8}
                    font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={10}
                    textAlign="center"
                    letterSpacing={0.2}
                  >
                    V-PRISM ARCHIVE{"\n"}INITIALIZE GALLERY TO START
                  </Text>
                </Float>
              </group>
            )}
          </AnimatePresence>

          <Environment preset="night" />
        </Canvas>
      </div>

      {/* UI Overlay */}
      {!isExportMode && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-8">
          
          {/* Header */}
          <header className="flex justify-between items-center pointer-events-auto h-16 border-b border-white/5 backdrop-blur-md px-4 rounded-2xl bg-white/[0.02]">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-tr from-rose-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-rose-500/20">
                <Star size={18} className="text-white" fill="currentColor" />
              </div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 uppercase">
                V-PRISM
              </h1>
            </motion.div>

            <div className="flex gap-4 items-center">
              <span className="hidden md:block text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Spatial Intelligence Engine</span>
              <div className="flex gap-2">
                <UIButton onClick={() => setIsFullscreen(!isFullscreen)}>
                  <Monitor size={16} />
                </UIButton>
                <UIButton onClick={clearPhotos}>
                  <RotateCcw size={16} />
                </UIButton>
              </div>
            </div>
          </header>

          {/* Layout Shift: Sidebar Left */}
          <div className="flex-1 flex pointer-events-none relative mt-4">
            <aside className="w-64 flex flex-col gap-4 pointer-events-auto z-40 overflow-y-auto no-scrollbar">
              <AnimatePresence>
                {photos.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="p-5 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl flex-1 flex flex-col shadow-2xl"
                  >
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-rose-400 font-bold mb-6">Display Geometry</h3>
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      <ModeButton active={mode === 'cube'} onClick={() => setMode('cube')} icon={<Box size={22} />} label="Prism Cube" />
                      <ModeButton active={mode === 'sphere'} onClick={() => setMode('sphere')} icon={<Circle size={22} />} label="Football (Sport)" />
                      <ModeButton active={mode === 'carousel'} onClick={() => setMode('carousel')} icon={<RotateCcw size={22} />} label="Orbiting Stream" />
                      <ModeButton active={mode === 'pyramid'} onClick={() => setMode('pyramid')} icon={<Triangle size={22} />} label="Relic Tet" />
                      <ModeButton active={mode === 'bento'} onClick={() => setMode('bento')} icon={<LayoutGrid size={22} />} label="High Density" />
                      <ModeButton active={mode === 'diamond'} onClick={() => setMode('diamond')} icon={<Heart size={22} />} label="Crystal Poly" />
                    </div>
                    
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Visual Parameters</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                          <span>Kinetic Rate</span>
                          <span>{rotationSpeed.toFixed(1)}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="2" 
                          step="0.1" 
                          value={rotationSpeed} 
                          onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-rose-500"
                        />
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-2">
                      <button 
                        onClick={() => setIsExportMode(true)}
                        className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-xl active:scale-95"
                      >
                        Launch Presentation
                      </button>
                      <p className="text-[9px] text-center text-slate-500 uppercase tracking-widest">Shareable on Mobile/PC</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </aside>

            {/* Main Empty State */}
            <main className="flex-1 flex items-center justify-center pointer-events-none">
              {photos.length === 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 50px rgba(244, 63, 94, 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="pointer-events-auto group relative flex flex-col items-center gap-8 p-20 rounded-[50px] border border-white/5 bg-white/[0.01] backdrop-blur-3xl transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 to-transparent rounded-[50px] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-600 flex items-center justify-center shadow-2xl transition-transform group-hover:rotate-12">
                    <Upload size={32} className="text-white" />
                  </div>
                  <div className="text-center relative z-10">
                    <h3 className="text-3xl font-thin tracking-[0.2em] uppercase text-white">Capture Reality</h3>
                    <p className="text-[10px] text-slate-500 mt-4 font-bold uppercase tracking-[0.4em]">Initialize Your Memory Plane</p>
                  </div>
                </motion.button>
              )}
            </main>
          </div>

          {/* Footer Asset Bar */}
          <AnimatePresence>
            {photos.length > 0 && (
              <motion.footer 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="pointer-events-auto h-20 flex items-center gap-4 mt-6"
              >
                <div className="flex-1 h-full bg-white/5 border border-white/10 backdrop-blur-2xl rounded-2xl flex items-center px-6 gap-4 overflow-hidden relative shadow-2xl">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 flex-shrink-0 bg-white/5 rounded-lg border border-dashed border-white/20 flex items-center justify-center group cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <Upload size={16} className="text-slate-400 group-hover:text-white" />
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                    {photos.slice(-15).map((p, i) => (
                      <motion.img 
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        src={p.url} 
                        className={`w-12 h-12 rounded-lg object-cover cursor-pointer hover:scale-110 transition-all ${i === photos.length - 1 ? 'border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'border border-white/10 opacity-60 hover:opacity-100'}`} 
                      />
                    ))}
                  </div>

                  <div className="ml-auto text-[9px] text-slate-500 font-mono hidden md:block uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{photos.length} NODES</div>
                </div>

                <div className="flex gap-2 h-full">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all active:scale-95"
                  >
                    <Settings2 size={16} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-40 h-full bg-white rounded-2xl text-black font-bold uppercase tracking-[0.1em] text-[10px] hover:bg-rose-50 transition-all shadow-xl active:scale-95"
                  >
                    Add Photos
                  </button>
                </div>
              </motion.footer>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Exit Export Mode Button */}
      {isExportMode && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleCaptureScreenshot}
            className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-3xl border border-white/10 rounded-2xl text-white hover:bg-white/20 transition-all active:scale-95 shadow-2xl group"
          >
            <Zap size={18} className="text-rose-400 group-hover:scale-125 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Capture 4K Image</span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleRecordVideo}
            disabled={isRecording}
            className={`flex items-center gap-3 px-6 py-3 backdrop-blur-3xl border border-white/10 rounded-2xl text-white transition-all active:scale-95 shadow-2xl group ${isRecording ? 'bg-rose-600 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
          >
            <Fullscreen size={18} className={isRecording ? 'animate-spin' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isRecording ? 'Recording (5s)...' : 'Record 3D Video'}
            </span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsExportMode(false)}
            className="p-4 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all active:scale-90 shadow-2xl"
          >
            <RotateCcw size={18} />
          </motion.button>
        </div>
      )}

      {isExportMode && (
         <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-white/40 text-[10px] uppercase tracking-[0.5em] font-light animate-pulse">
            Touch to Orbit • Auto-rotation Active
         </div>
      )}


      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        accept="image/*" 
        onChange={handleUpload}
        className="hidden"
      />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: #f43f5e;
          cursor: pointer;
          border-radius: 4px;
          border: 1.5px solid white;
          box-shadow: 0 0 10px rgba(244, 63, 94, 0.4);
        }

        @keyframes bg-pulse {
          0% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.3; }
          100% { transform: scale(1); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

function UIButton({ children, onClick }: { children: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-3 rounded-xl border border-white/5 bg-white/[0.05] backdrop-blur-md hover:bg-white/[0.1] hover:border-white/10 transition-all active:scale-95 text-slate-400 hover:text-white pointer-events-auto"
    >
      {children}
    </button>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 group transition-all relative overflow-hidden ${
        active 
        ? 'bg-white/10 border-rose-500 shadow-[inset_0_0_20px_rgba(244,63,94,0.15)] border-2' 
        : 'bg-white/5 border-white/10 hover:border-white/20'
      } border`}
    >
      <div className={`transition-transform duration-500 group-hover:scale-110 ${active ? 'text-rose-500' : 'text-slate-500'}`}>
        {icon}
      </div>
      <span className={`text-[9px] uppercase tracking-tighter ${active ? 'text-white' : 'text-slate-500'}`}>{label}</span>
      {active && <div className="absolute top-1 right-1 w-1 h-1 bg-rose-500 rounded-full animate-ping" />}
    </button>
  );
}
