export interface HygieneDocumentSection {
  key: string;
  title: string;
  data: Record<string, unknown>;
}

export interface HygieneDocumentRepresentation {
  documentId: string;
  templateKey: string;
  templateVersion: string;
  generatedAt: string;
  sections: HygieneDocumentSection[];
  disclaimer: string;
}
