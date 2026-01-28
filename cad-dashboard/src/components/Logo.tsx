import { Link } from 'react-router-dom';
import { Ambulance } from 'lucide-react';

interface LogoProps {
  showSubtitle?: boolean;
}

export default function Logo({ showSubtitle = false }: LogoProps) {
  return (
    <Link to="/" className="flex items-center space-x-3 group">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl blur opacity-40 group-hover:opacity-60 transition"></div>
        <div className="relative bg-gradient-to-br from-orange-500 to-red-600 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
          <Ambulance className="h-7 w-7 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline">
          <span className="text-xl font-bold text-white tracking-tight">FusionEMS</span>
          <span className="text-xl font-bold text-orange-500 ml-1">Quantum</span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] text-gray-500 uppercase tracking-widest -mt-0.5">
            The Regulated EMS Operating System
          </div>
        )}
      </div>
    </Link>
  );
}
