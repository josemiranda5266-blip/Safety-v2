import React, { useState } from 'react';
import { Star, Trash2, Copy, Check, Search, FileText, Bot, AlertCircle } from 'lucide-react';
import { FavoriteItem } from '../types/safety';
import { db } from '../services/db';

export const FavoritesScreen: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(db.getFavorites());
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    db.removeFavorite(id);
    setFavorites(db.getFavorites());
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = favorites.filter(
    (f) =>
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase tracking-wider">
            <Star className="w-4 h-4 fill-current" />
            <span>Consultas y Documentos Destacados</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Favoritos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {favorites.length} elementos guardados en tu dispositivo.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar entre tus favoritos guardados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-yellow-500 transition-colors"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-yellow-500 opacity-60" />
          <h3 className="font-bold text-slate-900 dark:text-white">No hay favoritos aún</h3>
          <p className="text-xs">
            Puedes presionar la estrella ⭐ en cualquier respuesta de la IA o documento para guardarlo aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((fav) => (
            <div
              key={fav.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {fav.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">{fav.date}</span>
                  <button
                    onClick={() => handleCopy(fav.id, fav.content)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors"
                    title="Copiar texto"
                  >
                    {copiedId === fav.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(fav.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Eliminar de favoritos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                {fav.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
