import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, Torus, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

function MouseLight() {
  const light = useRef();
  useFrame((state) => {
    if (light.current) {
      // Lerp the light position to follow mouse smoothly
      light.current.position.x = THREE.MathUtils.lerp(light.current.position.x, state.pointer.x * 8, 0.1);
      light.current.position.y = THREE.MathUtils.lerp(light.current.position.y, state.pointer.y * 8, 0.1);
    }
  });
  return <pointLight ref={light} position={[0, 0, 2]} intensity={5} color="#ffffff" distance={15} />;
}

function FloatingShapes() {
  const group = useRef();

  useFrame((state) => {
    if (group.current) {
      // Base continuous rotation/floating
      group.current.rotation.y = state.clock.elapsedTime * 0.05;
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.5;
      
      // Physics-based mouse tracking (lerping)
      const targetX = state.pointer.y * 0.5;
      const targetZ = -state.pointer.x * 0.5;
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, 0.05);
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, targetZ, 0.05);
    }
  });

  const glassMaterial = {
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0.9,
  };

  return (
    <group ref={group}>
      <Float speed={1.5} rotationIntensity={2} floatIntensity={2}>
        <Icosahedron args={[1, 0]} position={[-3, 1.5, -2]}>
          <meshStandardMaterial {...glassMaterial} color="#fca5a5" />
        </Icosahedron>
      </Float>
      
      <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
        <Torus args={[1.2, 0.4, 16, 32]} position={[3.5, 0, -3]} rotation={[Math.PI / 4, 0, 0]}>
          <meshStandardMaterial {...glassMaterial} color="#5eead4" />
        </Torus>
      </Float>

      <Float speed={1.2} rotationIntensity={2} floatIntensity={1.5}>
        <Sphere args={[0.8, 32, 32]} position={[0, -2, -1]}>
          <meshStandardMaterial {...glassMaterial} color="#fcd34d" />
        </Sphere>
      </Float>

      <Float speed={1.8} rotationIntensity={1} floatIntensity={2}>
        <Icosahedron args={[1.5, 1]} position={[-4, -1.5, -4]}>
          <meshStandardMaterial {...glassMaterial} color="#a5b4fc" />
        </Icosahedron>
      </Float>

      <Float speed={1} rotationIntensity={2} floatIntensity={1}>
        <Torus args={[0.8, 0.3, 16, 32]} position={[4, 2.5, -5]}>
          <meshStandardMaterial {...glassMaterial} color="#f9a8d4" />
        </Torus>
      </Float>
    </group>
  );
}

export default function ThreeBackground() {
  return (
    <div className="absolute inset-0 z-0 opacity-30 blur-[2px] pointer-events-none">
      <Canvas 
        camera={{ position: [0, 0, 8], fov: 40 }} 
        gl={{ powerPreference: "high-performance", antialias: false }}
        eventSource={document.getElementById('root')}
        eventPrefix="client"
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
        <directionalLight position={[-10, -10, -10]} intensity={1} color="#ffffff" />
        <MouseLight />
        <FloatingShapes />
      </Canvas>
    </div>
  );
}
