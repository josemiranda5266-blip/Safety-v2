import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Trash2, 
  FileText, 
  Tag, 
  Calendar, 
  Eye, 
  Sparkles,
  Plus,
  X,
  FileCheck,
  AlertCircle,
  Scale,
  UserCheck
} from 'lucide-react';
import { DocumentItem, CategoryType } from '../types/safety';
import { db } from '../services/db';
import { CompareDocumentsModal } from './CompareDocumentsModal';

interface LibraryScreenProps {
  onOpenUpload: () => void;
  onSelectDocForSummary: (doc: DocumentItem) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  onOpenUpload,
  onSelectDocForSummary,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>(db.getDocuments());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedTag, setSelectedTag] = useState<string>('TODAS');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('TODOS');
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const reloadDocs = () => {
    setDocuments(db.getDocuments());
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar este documento de tu biblioteca?')) {
      db.deleteDocument(id);
      reloadDocs();
    }
  };

  // Collect all unique tags and authors
  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags || [])));
  const allAuthors = Array.from(new Set(documents.map((d) => d.author).filter(Boolean)));

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'TODAS' || doc.category === selectedCategory;

    const matchesTag =
      selectedTag === 'TODAS' || (doc.tags && doc.tags.includes(selectedTag));

    const matchesAuthor =
      selectedAuthor === 'TODOS' || doc.author === selectedAuthor;

    return matchesSearch && matchesCategory && matchesTag && matchesAuthor;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Base de Conocimiento Local</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Biblioteca Normativa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {documents.length} documentos indexados y preparados para consultas con Inteligencia Artificial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCompareOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Scale className="w-4 h-4 text-amber-500" />
            <span>Comparar Normativas</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Cargar Documento</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar por Ley, Decreto, artículo, autor, tema o palabra clave..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Categories & Tags Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium mr-2">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            <span>Categoría:</span>
          </div>

          {['TODAS', 'Ley', 'Decreto', 'Resolución', 'Manual', 'Procedimiento'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium mr-2">
              <Tag className="w-3.5 h-3.5 text-emerald-500" />
              <span>Etiqueta:</span>
            </div>

            <button
              onClick={() => setSelectedTag('TODAS')}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                selectedTag === 'TODAS'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Todas
            </button>

            {allTags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Documents List Grid */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500 opacity-60" />
          <h3 className="font-bold text-slate-900 dark:text-white">No se encontraron documentos</h3>
          <p className="text-xs">Prueba cambiar los filtros de búsqueda o carga un nuevo archivo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setViewingDoc(doc)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold uppercase tracking-wide">
                    {doc.category}
                  </span>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {doc.documentDate}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-amber-500 transition-colors line-clamp-2">
                  {doc.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {doc.summary || doc.content.slice(0, 180) + '...'}
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400 text-[11px]">
                    {doc.pageCount} pág • {doc.chunksCount} fragmentos
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDocForSummary(doc);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-semibold text-[11px] transition-colors flex items-center gap-1"
                      title="Generar Resumen Técnico con IA"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Resumir</span>
                    </button>

                    <button
                      onClick={(e) => handleDelete(doc.id, e)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Eliminar documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Content Modal View */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 text-white space-y-6 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setViewingDoc(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pr-8">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase">
                {viewingDoc.category}
              </span>
              <h2 className="text-xl font-extrabold text-white mt-2">
                {viewingDoc.title}
              </h2>
              <p className="text-xs text-slate-400">
                Autor: {viewingDoc.author} • Fecha de Norma: {viewingDoc.documentDate} • {viewingDoc.pageCount} Páginas
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
              {viewingDoc.content}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  const docToSummarize = viewingDoc;
                  setViewingDoc(null);
                  onSelectDocForSummary(docToSummarize);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generar Resumen Técnico con IA</span>
              </button>

              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Documents Modal */}
      {isCompareOpen && (
        <CompareDocumentsModal
          onClose={() => setIsCompareOpen(false)}
          documents={documents}
        />
      )}
    </div>
  );
};
