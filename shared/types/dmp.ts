// Types for the editor's plan and the extraction JSON it imports and exports.

/** The plan's structure: title, section, section description, question, answer. */
export type BlockType =
  "title" | "section" | "description" | "question" | "answer";

/** One block of the plan. The editor keeps the plan as a flat list of blocks, like paragraphs in Word. */
export interface Block {
  id: string;
  type: BlockType;
  /** Escaped text and <br> only. No bold, italic, underline, fonts or sizes: the style is fixed. */
  html: string;
  /** Sections and questions only: false = printed without a number. */
  numbered?: boolean;
}

export interface PlanState {
  v: number;
  file: string;
  blocks: Block[];
  counts: { sections: number; questions: number };
}

/** The LLM extraction format (sample1.json). */
export interface ExtractionJson {
  narrative: {
    download_url?: string;
    template: {
      title: string;
      description?: string;
      version?: string;
      section: {
        title: string;
        description?: string;
        order: number;
        question: {
          text: string;
          order: number;
          answer: {
            json: {
              type: string;
              answer: string;
              meta?: Record<string, unknown>;
            };
          };
        }[];
      }[];
    };
  };
}
