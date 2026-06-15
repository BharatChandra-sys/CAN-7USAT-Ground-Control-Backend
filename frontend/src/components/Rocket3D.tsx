import { Canvas } from '@react-three/fiber';
import { Quaternion, Euler } from 'three';

interface Rocket3DProps {
  quat_w: number;
  quat_x: number;
  quat_y: number;
  quat_z: number;
}

const quaternionToEuler = (w: number, x: number, y: number, z: number) => {
  const sinrCosp = 2 * (w * x + y * z);
  const cosrCosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinrCosp, cosrCosp);

  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

  const sinyCosp = 2 * (w * z + x * y);
  const cosyCosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(sinyCosp, cosyCosp);

  return { roll, pitch, yaw };
};

const RocketModel = ({ quat_w, quat_x, quat_y, quat_z }: Rocket3DProps) => {
  const q = new Quaternion(quat_x, quat_y, quat_z, quat_w).normalize();
  const e = quaternionToEuler(q.w, q.x, q.y, q.z);

  // Visual policy: show pitch/roll attitude only.
  // Yaw is a heading value and remains numeric in the attitude matrix.
  const visualRotation = new Euler(e.pitch, 0, -e.roll, 'XYZ');

  return (
    <group rotation={visualRotation}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.055, 0.095, 1.35, 32]} />
        <meshStandardMaterial color="#d8d8d8" roughness={0.55} metalness={0.1} />
      </mesh>

      <mesh position={[0.78, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.105, 0.25, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.48} metalness={0.1} />
      </mesh>

      <mesh position={[-0.72, 0.09, 0]}>
        <boxGeometry args={[0.18, 0.035, 0.16]} />
        <meshStandardMaterial color="#8f8f8f" />
      </mesh>

      <mesh position={[-0.72, -0.09, 0]}>
        <boxGeometry args={[0.18, 0.035, 0.16]} />
        <meshStandardMaterial color="#8f8f8f" />
      </mesh>
    </group>
  );
};

export const Rocket3D = (props: Rocket3DProps) => (
  <Canvas camera={{ position: [0, 0, 3.25], fov: 38 }}>
    <ambientLight intensity={1.7} />
    <directionalLight position={[3, 2, 4]} intensity={1.15} />
    <RocketModel {...props} />
  </Canvas>
);
