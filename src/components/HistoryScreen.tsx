import React, { useState } from 'react';
import { History, Search, Trash2, ArrowRight, MessageSquare, AlertCircle } from 'lucide-react';
import { ChatSession } from '../types/safety';
import { db } from '../services/db';

interface HistoryScreenProps {
  onSelectQueryToAsk: (query: string) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onSelectQueryToAsk,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>(db.getChatSessions());
  const [search, setSearch] = useState('');

  const handleDeleteSession = (id: string) => {
    db.deleteChatSession(id);
    setSessions(db.getChatSessions());
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.messages.some((m) => m.text.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-500 text-xs font-bold uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Registro de Actividad</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Historial de Consultas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Revisa o reutiliza tus preguntas anteriores realizadas a la IA.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar en el historial de preguntas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-cyan-500 opacity-60" />
          <h3 className="font-bold text-slate-900 dark:text-white">Historial vacío</h3>
          <p className="text-xs">
            Las consultas que realices en el chat de IA se guardarán automáticamente aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const firstUserMsg = session.messages.find((m) => m.sender === 'user');
            const queryText = firstUserMsg ? firstUserMsg.text : session.title;

            return (
              <div
                key={session.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-500 shrink-0" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-cyan-500 transition-colors">
                      {queryText}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {session.messages.length} mensajes • {new Date(session.createdAt).toLocaleDateString('es-AR')}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onSelectQueryToAsk(queryText)}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Reutilizar Pregunta</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-2 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Eliminar del historial"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
