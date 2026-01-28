import React, { useRef } from 'react';

interface PhotoCaptureProps {
  onCapture: (photoData: string) => void;
  onError?: (error: Error) => void;
  photoType?: string;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ 
  onCapture, 
  onError,
  photoType = 'photo'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onCapture(result);
    };
    reader.onerror = () => {
      if (onError) {
        onError(new Error('Failed to read file'));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="photo-capture">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Capture {photoType}
      </button>
    </div>
  );
};

interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

export const TouchButton: React.FC<TouchButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false,
  className = ''
}) => {
  const baseClass = 'px-6 py-3 rounded-lg font-medium min-h-[48px] touch-manipulation';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

interface LargeCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export const LargeCheckbox: React.FC<LargeCheckboxProps> = ({ 
  checked, 
  onChange, 
  label,
  disabled = false
}) => {
  return (
    <label className="flex items-center space-x-3 cursor-pointer min-h-[48px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-6 h-6 rounded"
      />
      <span className="text-lg">{label}</span>
    </label>
  );
};

interface TouchSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
}

export const TouchSlider: React.FC<TouchSliderProps> = ({ 
  value, 
  onChange, 
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled = false
}) => {
  return (
    <div className="touch-slider w-full">
      {label && <label className="block mb-2 text-sm font-medium">{label}</label>}
      <div className="flex items-center space-x-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-lg font-medium min-w-[3rem] text-right">{value}</span>
      </div>
    </div>
  );
};

interface MultiSelectTilesProps {
  options: Array<{ value: string; label: string; icon?: string }>;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export const MultiSelectTiles: React.FC<MultiSelectTilesProps> = ({ 
  options, 
  selectedValues, 
  onChange,
  disabled = false
}) => {
  const toggleValue = (value: string) => {
    if (disabled) return;
    
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => toggleValue(option.value)}
            disabled={disabled}
            className={`
              min-h-[80px] p-4 rounded-lg border-2 flex flex-col items-center justify-center
              touch-manipulation transition-colors
              ${isSelected 
                ? 'border-blue-600 bg-blue-50 text-blue-700' 
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {option.icon && <span className="text-2xl mb-2">{option.icon}</span>}
            <span className="text-sm font-medium text-center">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
