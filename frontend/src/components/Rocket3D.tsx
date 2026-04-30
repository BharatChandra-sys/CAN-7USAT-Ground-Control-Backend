/**
 * Simplified 3D Rocket Visualization - Optimized for Performance
 */

import { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

interface Rocket3DProps {
  quat_w: number;
  quat_x: number;
  quat_y: number;
  quat_z: number;
}

// Simple rocket mesh component
function RocketMesh({ quat_w, quat_x, quat_y, quat_z }: Rocket3DProps) {
  const rocketRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (rocketRef.current) {
      // Apply quaternion rotation
      const quaternion = new THREE.Quaternion(quat_x, quat_y, quat_z, quat_w);
      rocketRef.current.setRotationFromQuaternion(quaternion);
    }
  }, [quat_w, quat_x, quat_y, quat_z]);
  
  return (
    <group ref={rocketRef}>
      {/* Rocket body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 3, 8]} />
        <meshBasicMaterial color="#888888" />
      </mesh>
      
      {/* Nose cone */}
      <mesh position={[0, 2, 0]}>
        <coneGeometry args={[0.2, 1, 8]} />
        <meshBasicMaterial color="#666666" />
      </mesh>
      
      {/* Direction indicator */}
      <mesh position={[0, 2.8, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}

export const Rocket3D: React.FC<Rocket3DProps> = (props) => {
  return (
    <div style={{ width: '100%', height: '100%', background: '#f8f8f8' }}>
      <Canvas camera={{ position: [5, 3, 5], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <RocketMesh {...props} />
      </Canvas>
    </div>
  );
};
