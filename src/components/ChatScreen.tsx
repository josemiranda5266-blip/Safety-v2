import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  FileText, 
  Star, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Search,
  BookOpen,
  Quote,
  ShieldCheck,
  Building2,
  HelpCircle,
  Scale,
  Mic,
  MicOff
} from 'lucide-react';
import { ChatMessage, Citation } from '../types/safety';
import { db } from '../services/db';
import { exportChatAnswerPDF } from '../services/pdfExporter';
import { useTenant } from '../context/TenantContext';

interface ChatScreenProps {
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  initialQuery,
  onClearInitialQuery,
}) => {
  const { activeCompany, establishments, sectors, employees } = useTenant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing active chat session or start new one
    const sessions = db.getChatSessions();
    if (sessions.length > 0 && sessions[0].messages.length > 0) {
      setMessages(sessions[0].messages);
    } else {
      const companyName = activeCompany?.tradeName || activeCompany?.legalName;
      const companyGreeting = companyName 
        ? ` Estoy configurado para responder en el contexto de **${companyName}** (${activeCompany?.activityDescription || 'Actividad General'}).`
        : '';
      setMessages([
        {
          id: 'welcome_msg',
          sender: 'ai',
          text: `¡Hola! Soy **Safety IA**, tu biblioteca técnica y consultor legal en Higiene y Seguridad Laboral.${companyGreeting}

Puedo responder tus consultas normativas utilizando **la información cargada en tu biblioteca** (Leyes, Decretos, Resoluciones SRT, Manuales de EPP, etc.).

Escribe tu pregunta o selecciona una de las consultas sugeridas debajo.`,
          timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [activeCompany?.id]);

  useEffect(() => {
    if (initialQuery) {
      handleSendMessage(initialQuery);
      onClearInitialQuery?.();
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const saveCurrentSession = (updatedMessages: ChatMessage[]) => {
    setMessages(updatedMessages);
    const sessions = db.getChatSessions();
    const sessionId = sessions.length > 0 ? sessions[0].id : `session_${Date.now()}`;
    
    db.saveChatSession({
      id: sessionId,
      title: updatedMessages.find((m) => m.sender === 'user')?.text.slice(0, 40) || 'Consulta CySAT',
      createdAt: new Date().toISOString(),
      messages: updatedMessages,
    });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    saveCurrentSession(newMessages);
    if (!textToSend) setInput('');
    setIsLoading(true);

    const startTime = performance.now();

    try {
      // 1. Search local RAG database for top matching chunks
      const matchedChunks = db.searchRelevantChunks(queryText, 6);

      const formattedChunks = matchedChunks.map((c) => ({
        docTitle: c.docTitle,
        category: c.category,
        page: c.pageNumber,
        chapter: c.chapter,
        section: c.section,
        article: c.article,
        text: c.text,
      }));

      // 2. Build tenant context
      const companyDisplayName = activeCompany?.tradeName || activeCompany?.legalName;
      const tenantContext = activeCompany ? {
        companyName: companyDisplayName || 'Empresa',
        legalName: activeCompany.legalName,
        taxId: activeCompany.cuit,
        activity: activeCompany.activityDescription,
        establishmentName: establishments[0]?.name,
        sectors: sectors.map((s) => s.name).join(', '),
        totalEmployees: employees.length,
      } : undefined;

      // 3. Call backend RAG endpoint
      const data = await db.callAiApi<{ answer: string; creditsRemaining?: number }>('/api/chat-rag', {
        question: queryText,
        contextChunks: formattedChunks,
        tenantContext,
      });

      const aiAnswer = data.answer || 'No encontré información suficiente sobre este tema dentro de tu biblioteca documental.';

      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      // Extract citations if the answer found data in library
      const citations: Citation[] = matchedChunks.map((c) => ({
        docTitle: c.docTitle,
        category: c.category,
        pageNumber: c.pageNumber,
        chapter: c.chapter,
        section: c.section,
        article: c.article,
        quotedText: c.text.slice(0, 180) + '...',
      }));

      const isNotFound = aiAnswer.includes('No encontré información suficiente');
      const activeCitations = isNotFound ? [] : citations;

      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: aiAnswer,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        citations: activeCitations,
        responseTimeMs,
        fromCache: false,
      };

      // Save log and cache entry
      const logEntry = {
        id: `log_${Date.now()}`,
        question: queryText,
        answer: aiAnswer,
        documentsUsed: activeCitations.map((c) => c.docTitle),
        citations: activeCitations,
        timestamp: new Date().toISOString(),
        responseTimeMs,
        cached: false,
      };

      db.addRAGLog(logEntry);
      if (!isNotFound) {
        db.setCachedQuery(queryText, logEntry);
      }

      saveCurrentSession([...newMessages, aiMsg]);
    } catch (err: any) {
      console.error('Error en chat:', err);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'ai',
        text: `⚠️ Ocurrió un error al procesar tu consulta: ${err.message || 'Error del servidor'}.`,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      };
      saveCurrentSession([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = (msg: ChatMessage) => {
    const isFav = db.isFavorite(msg.text);
    if (isFav) {
      const favs = db.getFavorites();
      const fav = favs.find((f) => f.content === msg.text);
      if (fav) db.removeFavorite(fav.id);
    } else {
      db.addFavorite({
        type: 'response',
        title: msg.citations && msg.citations.length > 0 ? `Respuesta: ${msg.citations[0].docTitle}` : 'Consulta de Higiene y Seguridad',
        content: msg.text,
        date: new Date().toLocaleDateString('es-AR'),
        metadata: { citations: msg.citations },
      });
    }

    const updated = messages.map((m) =>
      m.id === msg.id ? { ...m, isFavorite: !isFav } : m
    );
    saveCurrentSession(updated);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tu navegador no soporta entrada de voz por micrófono.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.interimResults = false;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const filteredMessages = messages.filter((m) =>
    searchFilter ? m.text.toLowerCase().includes(searchFilter.toLowerCase()) : true
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] md:h-[calc(100vh-5.5rem)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Chat Top Toolbar */}
      <div className="px-4 sm:px-6 py-3 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Chat RAG Normativo</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Respuestas técnicamente fundamentadas y grounded en tu biblioteca
            </p>
          </div>
        </div>

        {/* Filter in conversation & Reset Chat */}
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar en el chat..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={() => {
              setMessages([]);
              db.saveChatSession({
                id: `session_${Date.now()}`,
                title: 'Nueva Consulta',
                createdAt: new Date().toISOString(),
                messages: [],
              });
            }}
            className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Limpiar Conversación"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nuevo Chat</span>
          </button>
        </div>
      </div>

      {/* Active Company Context Banner */}
      <div className="px-4 sm:px-6 py-2 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          {activeCompany ? (
            <span>
              Contexto Activo: <strong className="font-semibold">{activeCompany.tradeName || activeCompany.legalName}</strong>
              {activeCompany.activityDescription ? ` (${activeCompany.activityDescription})` : ''}
              {activeCompany.cuit ? ` • CUIT: ${activeCompany.cuit}` : ''}
            </span>
          ) : (
            <span className="text-slate-600 dark:text-slate-400">
              Modo General de Consulta (Selecciona una empresa en la barra superior para contextualizar)
            </span>
          )}
        </div>
        <div className="hidden md:flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400/80">
          <Scale className="w-3.5 h-3.5" />
          <span>Marco Legal SRT / Ley 19.587</span>
        </div>
      </div>

      {/* Messages Stream View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Quick Suggested Queries Chips */}
        {messages.length <= 1 && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Consultas Rápidas Sugeridas {activeCompany ? `para ${activeCompany.tradeName || activeCompany.legalName}` : ''}:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                `¿Qué EPPs son obligatorios según la Res. SRT 299/11?`,
                `¿Cuáles son las obligaciones del Servicio de Higiene según Res. SRT 905/15?`,
                `¿Cómo se realiza el protocolo de medición de iluminación bajo Res. SRT 84/12?`,
                `¿Qué requisitos exige la Res. SRT 900/15 para puesta a tierra?`,
                `¿Cuáles son los límites de carga y ergonomía según Res. 295/03 y 886/15?`,
                `¿Qué condiciones de protección contra incendios exige el Dec. 351/79?`,
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(suggestion)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 text-xs text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-left shadow-sm hover:shadow"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <BookOpen className="w-10 h-10 mx-auto text-slate-500 opacity-50" />
            <p className="text-sm font-semibold">No se encontraron mensajes con la búsqueda.</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 max-w-3xl ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-2 max-w-full">
                <div
                  className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-sky-500 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700/80 shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans text-sm sm:text-base">
                    {msg.text}
                  </div>

                  {/* Display Citations if available */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        <Quote className="w-3.5 h-3.5" />
                        <span>Fuentes de la Biblioteca Utilizadas</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {msg.citations.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2.5 rounded-xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-1"
                          >
                            <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                              <span className="flex items-center gap-1 truncate">
                                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                {c.docTitle}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                  Pág. {c.pageNumber}
                                </span>
                                {c.article && (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                    {c.article}
                                  </span>
                                )}
                              </div>
                            </div>

                            {(c.chapter || c.section) && (
                              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                {c.chapter && <span>Capítulo: {c.chapter} </span>}
                                {c.section && <span>| Sección: {c.section}</span>}
                              </div>
                            )}

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                              "{c.quotedText}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Actions */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
                  <span>{msg.timestamp}</span>

                  {msg.responseTimeMs !== undefined && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-mono font-bold text-[10px] flex items-center gap-0.5">
                      ⚡ {msg.responseTimeMs}ms {msg.fromCache ? '(Caché)' : ''}
                    </span>
                  )}

                  {msg.sender === 'ai' && (
                    <>
                      <span>•</span>
                      <button
                        onClick={() => handleToggleFavorite(msg)}
                        className={`hover:text-amber-400 transition-colors flex items-center gap-1 ${
                          db.isFavorite(msg.text) ? 'text-amber-400 font-bold' : ''
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{db.isFavorite(msg.text) ? 'Guardado' : 'Favorito'}</span>
                      </button>

                      <span>•</span>
                      <button
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === msg.id ? 'Copiado' : 'Copiar'}</span>
                      </button>

                      <span>•</span>
                      <button
                        onClick={() => exportChatAnswerPDF(messages[messages.indexOf(msg) - 1]?.text || 'Consulta', msg.text, msg.citations)}
                        className="hover:text-sky-400 transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exportar PDF</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* AI Loading Skeleton Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs space-y-2 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Buscando en la biblioteca técnica y generando respuesta...</span>
              </div>
              <div className="h-2 bg-slate-300 dark:bg-slate-700 rounded w-48"></div>
              <div className="h-2 bg-slate-300 dark:bg-slate-700 rounded w-32"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`p-3 rounded-2xl border transition-all ${
              isListening
                ? 'bg-rose-500 text-white border-rose-600 animate-bounce'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700'
            }`}
            title="Dictado por voz"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            placeholder="Pregunta a la IA (ej: ¿Qué EPP exige la Ley 19.587 en trabajos de soldadura?)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-2">
          Safety IA no inventa leyes ni supuestos. Si un tema no está en tu biblioteca, te lo indicará expresamente.
        </p>
      </div>
    </div>
  );
};
