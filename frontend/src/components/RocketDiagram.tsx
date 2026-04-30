/**
 * Rocket Diagram Component - Lafayette Systems Style
 * Shows rocket schematic with orientation indicator
 */

import React from 'react';

interface RocketDiagramProps {
  quat_w: number;
  quat_x: number;
  quat_y: number;
  quat_z: number;
}

export const RocketDiagram: React.FC<RocketDiagramProps> = ({ quat_w, quat_x, quat_y, quat_z }) => {
  // Calculate rotation angle from quaternion (simplified for 2D display)
  const angle = Math.atan2(2 * (quat_w * quat_z + quat_x * quat_y), 1 - 2 * (quat_y * quat_y + quat_z * quat_z)) * (180 / Math.PI);
  
  return (
    <div className="rocket-diagram">
      <svg className="rocket-svg" viewBox="0 0 120 200">
        <g transform={`translate(60, 100) rotate(${angle}) translate(-60, -100)`}>
          {/* Rocket Body */}
          <rect 
            x="50" 
            y="60" 
            width="20" 
            height="80" 
            className="rocket-body"
          />
          
          {/* Nose Cone */}
          <polygon 
            points="50,60 70,60 60,30" 
            className="rocket-nose"
          />
          
          {/* Fins */}
          <polygon 
            points="45,120 50,140 50,120" 
            className="rocket-fins"
          />
          <polygon 
            points="70,120 70,140 75,120" 
            className="rocket-fins"
          />
          
          {/* Engine Nozzle */}
          <rect 
            x="52" 
            y="140" 
            width="16" 
            height="15" 
            className="rocket-engine"
          />
          
          {/* Parachute Compartments */}
          <rect 
            x="51" 
            y="65" 
            width="18" 
            height="8" 
            fill="none" 
            stroke="#000" 
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <text x="60" y="70" fontSize="6" textAnchor="middle" fill="#000">DROGUE</text>
          
          <rect 
            x="51" 
            y="80" 
            width="18" 
            height="12" 
            fill="none" 
            stroke="#000" 
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <text x="60" y="87" fontSize="6" textAnchor="middle" fill="#000">MAIN</text>
          
          {/* Payload Bay */}
          <rect 
            x="51" 
            y="100" 
            width="18" 
            height="15" 
            fill="none" 
            stroke="#000" 
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <text x="60" y="108" fontSize="6" textAnchor="middle" fill="#000">PAYLOAD</text>
          
          {/* Direction Arrow */}
          <polygon 
            points="60,25 65,35 55,35" 
            fill="#000"
          />
        </g>
        
        {/* Reference Grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#ddd" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />
        
        {/* Axis Labels */}
        <text x="10" y="15" fontSize="8" fill="#666">N</text>
        <text x="10" y="190" fontSize="8" fill="#666">S</text>
        <text x="5" y="105" fontSize="8" fill="#666">W</text>
        <text x="110" y="105" fontSize="8" fill="#666">E</text>
        
        {/* Attitude Indicator */}
        <circle cx="100" cy="30" r="15" fill="none" stroke="#000" strokeWidth="2"/>
        <line 
          x1="100" 
          y1="30" 
          x2={100 + 12 * Math.sin(angle * Math.PI / 180)} 
          y2={30 - 12 * Math.cos(angle * Math.PI / 180)} 
          stroke="#000" 
          strokeWidth="2"
        />
        <text x="100" y="55" fontSize="6" textAnchor="middle" fill="#000">
          {angle.toFixed(0)}°
        </text>
      </svg>
    </div>
  );
};