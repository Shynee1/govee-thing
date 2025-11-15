import React from 'react';
import { GoveeDevice } from '../services/GoveeService';

interface DeviceCardProps {
  device: GoveeDevice;
  isSelected: boolean;
  onToggleSelect: (deviceId: string) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, isSelected, onToggleSelect }) => {
  // Extract model number from device name (e.g., "H6008" from the name)
  const modelMatch = device.name.match(/H\d{4}/i);
  const modelNumber = modelMatch ? modelMatch[0].toLowerCase() : null;
  
  // Try device-specific image, fallback to H6008
  const imagePath = modelNumber ? `./${modelNumber}.jpg` : './h6008.jpg';
  const fallbackImage = './h6008.jpg';

  return (
    <div 
      className={`flex-shrink-0 w-56 bg-gray-800 rounded-xl p-6 cursor-pointer transition-all ${
        isSelected ? 'ring-4 ring-blue-500 shadow-lg shadow-blue-500/50' : 'hover:bg-gray-700'
      }`}
      onClick={() => onToggleSelect(device.id)}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Device Image */}
        <div className="w-30 h-30 rounded-xl overflow-hidden bg-gray-700 flex items-center justify-center">
          <img 
            src={imagePath}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== fallbackImage) {
                target.src = fallbackImage;
              }
            }}
            alt="Govee Light" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Device Name */}
        <div className="text-white font-bold text-lg text-center truncate w-full">
          {device.name}
        </div>
        
        {/* Device ID */}
        <div className="text-gray-400 text-sm text-center truncate w-full">
          {device.id}
        </div>
        
      </div>
    </div>
  );
};

export default DeviceCard;
