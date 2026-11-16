// Types for the /import flow: upload, review structure, review metadata, export.

/** A question always carries its one answer. */
export interface ImportQuestion {
  id: number;
  text: string;
  answer: string;
}

/** A section has a title and an (optional) description. */
export interface ImportSection {
  id: number;
  title: string;
  description: string;
  questions: ImportQuestion[];
}

export interface ImportPlan {
  title: string;
  description: string;
  version: string;
}

export type ImportBlockKind = "plan" | "section" | "question";
export type ImportBlockPart = "description" | "answer";

/** `part` is set while the caret is in a section's description or a question's answer. */
export interface ImportSelection {
  kind: ImportBlockKind;
  id?: number;
  part?: ImportBlockPart;
}

export interface RdaCreator {
  name?: string | null;
  affiliation?: { name?: string | null }[];
  creator_id?: { identifier?: string | null; type?: string | null };
}

/** The dataset fields the metadata step edits. Everything else in the RDA JSON passes through untouched. */
export interface RdaDataset {
  title?: string | null;
  description?: string | null;
  type?: string | null;
  dataset_id?: { identifier?: string | null; type?: string | null };
  personal_data?: string | null;
  sensitive_data?: string | null;
  metadata?: { language?: string | null; [key: string]: unknown }[];
  distribution?: {
    data_access?: string | null;
    license?: { license_ref?: string | null; [key: string]: unknown }[];
    host?: {
      title?: string | null;
      url?: string | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }[];
  creator?: RdaCreator[];
  [key: string]: unknown;
}

export interface RdaDocument {
  dmp: { dataset?: RdaDataset[]; [key: string]: unknown };
  [key: string]: unknown;
}
