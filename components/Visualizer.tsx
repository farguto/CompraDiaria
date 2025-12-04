import React from 'react';

interface Props {
  isActive: boolean;
}

export const Visualizer: React.FC<Props> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-1 h-8">
      <div className="w-1.5 h-3 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-1.5 h-6 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-1.5 h-3 bg-indigo-500 rounded-full animate-bounce"></div>
      <div className="w-1.5 h-5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
    </div>
  );
};
