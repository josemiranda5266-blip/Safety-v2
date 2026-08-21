import React, { useState } from 'react';
import { Bot, Check, X, Edit2, Loader2 } from 'lucide-react';

interface AISuggestion {
  id: string;
  type: 'hazard' | 'control' | 'draft' | 'plan';
  suggestion: any;
  originalValue?: any;
}

export const AISafetyAssistant: React.FC<{ 
  onAccept: (s: AISuggestion) => void;
  onReject: (s: AISuggestion) => void;
  onModify: (s: AISuggestion) => void;
}> = ({ onAccept, onReject, onModify }) => {
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [loading, setLoading] = useState(false);

  // This is a generic interface for the AI assistant features
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mt-6">
      <div className="flex items-center gap-2 text-indigo-400 mb-4">
        <Bot className="w-5 h-5" />
        <h3 className="font-semibold">Asistente IA de Higiene y Seguridad</h3>
      </div>
      
      {!suggestion && (
        <button className="text-sm bg-slate-800 p-2 rounded hover:bg-slate-700">Solicitar Sugerencia</button>
      )}

      {suggestion && (
        <div className="space-y-4">
          <pre className="text-xs text-slate-300 bg-black p-2 rounded">{JSON.stringify(suggestion.suggestion, null, 2)}</pre>
          <div className="flex gap-2">
            <button onClick={() => onAccept(suggestion)} className="bg-green-600 text-white p-2 rounded"><Check className="w-4 h-4" /></button>
            <button onClick={() => onModify(suggestion)} className="bg-blue-600 text-white p-2 rounded"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => onReject(suggestion)} className="bg-red-600 text-white p-2 rounded"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};
