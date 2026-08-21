import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { DocumentItem, DocChunk, CategoryType } from '../types/safety';
import { db } from './db';

export interface ProcessedResult {
  document: DocumentItem;
  chunks: DocChunk[];
}

export async function processUploadedFile(
  file: File,
  categoryOverride?: CategoryType,
  onProgress?: (progress: number, stage: string) => void
): Promise<ProcessedResult> {
  const fileType = detectFileType(file);
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const uploadDate = new Date().toISOString();

  onProgress?.(10, 'Leyendo archivo...');

  let rawText = '';
  let pageCount = 1;
  let category: CategoryType = categoryOverride || detectCategoryByFilename(file.name);

  if (fileType === 'docx') {
    onProgress?.(30, 'Extrayendo texto de documento Word...');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    rawText = result.value;
  } else if (fileType === 'xlsx') {
    onProgress?.(30, 'Extrayendo hojas de cálculo Excel...');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetTextArray: string[] = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim().length > 0) {
        sheetTextArray.push(`--- HOJA: ${sheetName} ---\n${csv}`);
      }
    });
    rawText = sheetTextArray.join('\n\n');
  } else if (fileType === 'txt') {
    onProgress?.(40, 'Procesando archivo de texto...');
    rawText = await file.text();
  } else if (fileType === 'image') {
    onProgress?.(30, 'Ejecutando OCR Inteligente con IA en imagen...');
    const base64 = await fileToBase64(file);
    const mimeType = file.type || 'image/jpeg';

    const ocrData = await db.callAiApi<any>('/api/ocr-extract', {
      imageBase64: base64,
      mimeType,
      fileName: file.name,
    });

    rawText = ocrData.extractedText || '';
    if (ocrData.category) category = ocrData.category as CategoryType;
  } else if (fileType === 'pdf') {
    onProgress?.(30, 'Procesando PDF normativo...');
    // PDF extraction fallback: text read or OCR if scanned image
    try {
      const text = await file.text();
      if (text.trim().length > 100 && !text.includes('%PDF-')) {
        rawText = text;
      } else {
        // Use Gemini OCR for scanned PDF page image / buffer
        onProgress?.(50, 'Escaneando contenido gráfico con OCR...');
        const base64 = await fileToBase64(file);
        try {
          const ocrResult = await db.callAiApi<any>('/api/ocr-extract', {
            imageBase64: base64,
            mimeType: 'application/pdf',
            fileName: file.name,
          });
          rawText = ocrResult.extractedText || '';
        } catch (e) {
          rawText = `[DOCUMENTO PDF: ${file.name}]\nContenido importado para biblioteca de seguridad laboral.`;
        }
      }
    } catch (e) {
      rawText = `[DOCUMENTO PDF: ${file.name}]\nContenido importado para biblioteca de seguridad laboral.`;
    }
  } else {
    onProgress?.(40, 'Extrayendo contenido de texto...');
    rawText = await file.text();
  }

  onProgress?.(70, 'Indexando fragmentos y dividiendo páginas...');

  // Estimate page count (~2500 chars per page)
  pageCount = Math.max(1, Math.ceil(rawText.length / 2500));

  // Chunking rawText into structured fragments with page tracking
  const chunks: DocChunk[] = [];
  const chunkSize = 800; // ~150 words per chunk for clean RAG context
  const overlap = 150;
  
  let currentIndex = 0;
  let chunkIndex = 1;

  if (!rawText || rawText.trim().length < 20) {
    rawText = `Documento de Higiene y Seguridad Laboral: ${file.name}\nImportado correctamente en la biblioteca técnica el ${new Date().toLocaleDateString('es-AR')}.`;
  }

  while (currentIndex < rawText.length) {
    const chunkText = rawText.slice(currentIndex, currentIndex + chunkSize).trim();
    if (chunkText.length > 10) {
      const estimatedPage = Math.min(pageCount, Math.floor(currentIndex / 2500) + 1);
      
      // Extract chapter, section, and article if present in the chunkText or surrounding text
      const chapterMatch = chunkText.match(/Cap[íi]tulo\s+([IVXLCDM\d]+|[A-Za-z0-9áéíóúñ\s]{3,30})/i);
      const articleMatch = chunkText.match(/(?:Art[íi]culo|Art\.)\s*(\d+[a-z]?)/i);
      const sectionMatch = chunkText.match(/Secci[óo]n\s+([IVXLCDM\d]+|[A-Za-z0-9áéíóúñ\s]{3,30})/i);

      chunks.push({
        id: `chunk_${docId}_${chunkIndex}`,
        docId: docId,
        docTitle: file.name.replace(/\.[^/.]+$/, ''),
        category,
        pageNumber: estimatedPage,
        chapter: chapterMatch ? chapterMatch[0].trim() : undefined,
        section: sectionMatch ? sectionMatch[0].trim() : undefined,
        article: articleMatch ? `Art. ${articleMatch[1]}` : undefined,
        text: chunkText,
        uploadDate,
      });
      chunkIndex++;
    }
    currentIndex += chunkSize - overlap;
  }

  onProgress?.(95, 'Generando etiquetas y registrando en la base de datos...');

  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
  const autoTags = generateAutoTags(cleanTitle, rawText, category);

  const documentItem: DocumentItem = {
    id: docId,
    title: cleanTitle,
    category,
    author: 'Usuario / Biblioteca Local',
    issuingOrganism: 'Organismo Oficial',
    uploadDate,
    documentDate: new Date().toISOString().split('T')[0],
    tags: autoTags,
    content: rawText,
    pageCount,
    fileType,
    fileSize: file.size,
    chunksCount: chunks.length,
    summary: rawText.slice(0, 300) + '...',
    version: 1,
    status: 'Vigente',
    versionHistory: [],
    processingState: 'indexed',
  };

  onProgress?.(100, '¡Documento indexado con éxito!');

  return {
    document: documentItem,
    chunks,
  };
}

function detectFileType(file: File): 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'image' {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return 'xlsx';
  if (name.endsWith('.pptx') || name.endsWith('.ppt')) return 'pptx';
  if (file.type.startsWith('image/') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image';
  return 'txt';
}

function detectCategoryByFilename(fileName: string): CategoryType {
  const lower = fileName.toLowerCase();
  if (lower.includes('ley')) return 'Ley';
  if (lower.includes('decreto') || lower.includes('dec')) return 'Decreto';
  if (lower.includes('resolucion') || lower.includes('res') || lower.includes('srt')) return 'Resolución SRT';
  if (lower.includes('iram')) return 'Norma IRAM';
  if (lower.includes('iso')) return 'Norma ISO';
  if (lower.includes('manual')) return 'Manual';
  if (lower.includes('procedimiento') || lower.includes('pts')) return 'Procedimiento';
  if (lower.includes('instructivo')) return 'Instructivo';
  if (lower.includes('apunte')) return 'Apunte';
  if (lower.includes('formulario')) return 'Formulario';
  return 'Informe';
}

function generateAutoTags(title: string, content: string, category: CategoryType): string[] {
  const tagsSet = new Set<string>();
  tagsSet.add(category);

  const keywords = [
    'EPP', 'Extintores', 'Incendio', 'Electricidad', 'Ruido', 'Iluminación',
    'Escaleras', 'Trabajo en Altura', 'Andamios', 'Excavaciones', 'Ergonomía',
    'Riesgo Químico', 'Riesgo Biológico', 'Espacios Confinados', 'Construcción'
  ];

  const fullText = (title + ' ' + content).toLowerCase();
  keywords.forEach((kw) => {
    if (fullText.includes(kw.toLowerCase())) {
      tagsSet.add(kw);
    }
  });

  return Array.from(tagsSet).slice(0, 6);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
}
