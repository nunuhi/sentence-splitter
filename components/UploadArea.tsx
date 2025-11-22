import React, { useCallback } from 'react';

interface UploadAreaProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFileSelect, disabled }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('audio/')) {
        onFileSelect(file);
      }
    },
    [disabled, onFileSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors duration-200 ease-in-out
        ${disabled ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed' : 'border-indigo-300 bg-white hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer'}
      `}
    >
      <input
        type="file"
        accept="audio/*"
        onChange={handleChange}
        className="hidden"
        id="audio-upload"
        disabled={disabled}
      />
      <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
        </div>
        <div className="text-slate-700">
          <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop audio file
        </div>
        <p className="text-sm text-slate-500">MP3, WAV, M4A (Max 20MB)</p>
      </label>
    </div>
  );
};

export default UploadArea;
