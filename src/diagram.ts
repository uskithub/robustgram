export type ParseErrorDetail = {
  text: string;
  token: string;
  line: number;
  loc: {
    first_line: number;
    last_line: number;
    first_column: number;
    last_column: number;
  };
  expected: string[];
};
export interface DiagramDB {
  // db
  clear?: () => void;
  parseError?: (message: string, hash?: ParseErrorDetail) => void;
}
export interface DiagramRenderer {
  draw: (
    text: string,
    id: string,
    version: string,
    db?: DiagramDB
  ) => Promise<void>;
}

export interface ParserDefinition {
  yy: DiagramDB;
  parse: (text: string) => any; // parserで返すトップの $$ が返る
}

export interface DiagramDefinition {
  db: DiagramDB;
  renderer: DiagramRenderer;
  parser: ParserDefinition;
}

const diagrams: Record<string, DiagramDefinition> = {};

export const registerDiagram = (id: string, diagram: DiagramDefinition) => {
  diagrams[id] = diagram;
};

export interface DiagramMetadata {
  title?: string;
}

const encodeEntities = (text: string): string => {
  return text
    .replace(/style.*:\S*#.*;/g, (s): string => {
      return s.substring(0, s.length - 1);
    })
    .replace(/classDef.*:\S*#.*;/g, (s): string => {
      return s.substring(0, s.length - 1);
    })
    .replace(/#\w+;/g, (s): string => {
      const innerTxt = s.substring(1, s.length - 1);

      const isInt = /^\+?\d+$/.test(innerTxt);
      if (isInt) {
        return "ﬂ°°" + innerTxt + "¶ß";
      } else {
        return "ﬂ°" + innerTxt + "¶ß";
      }
    });
};

const frontMatterRegex = /^-{3}\s*[\n\r](.*?)[\n\r]-{3}\s*[\n\r]+/s;
const directiveRegex =
  /%{2}{\s*(?:(\w+)\s*:|(\w+))\s*(?:(\w+)|((?:(?!}%{2}).|\r?\n)*))?\s*(?:}%{2})?/gi;
const anyCommentRegex = /\s*%%.*\n/gm;

export class Diagram {
  public static detectType(text: string): string {
    text = text
      .replace(frontMatterRegex, "")
      .replace(directiveRegex, "")
      .replace(anyCommentRegex, "\n");

    if (/^\s*stateDiagram/.test(text)) {
      return "stateDiagram";
    } else if (/^\s*robustive/.test(text)) {
      return "robustive";
    } else {
      throw new Error(
        `No diagram type detected matching given configuration for text: ${text}`
      );
    }
  }

  public static async fromText(text: string, metadata: DiagramMetadata = {}) {
    console.log("========= fromText =========", text);

    const type = Diagram.detectType(text);
    text = encodeEntities(text) + "\n";

    const d = diagrams[type];

    const { db, parser, renderer } = d;

    db.clear?.();

    // This block was added for legacy compatibility. Use frontmatter instead of adding more special cases.
    if (metadata.title) {
      db.setDiagramTitle?.(metadata.title);
    }

    try {
      console.log("========= parser start =========", parser);
      const parseResult = parser.parse(text);
      console.log("========= parse end =========", parseResult);
    } catch (e) {
      console.error(e);
      throw e;
    }

    return new Diagram(type, text, db, parser, renderer);
  }

  private constructor(
    public type: string,
    public text: string,
    public db: DiagramDB,
    public parser: ParserDefinition,
    public renderer: DiagramRenderer
  ) {}

  async render(id: string, version: string): Promise<void> {
    console.log("========= render =========", this.text, id, version, this.db);
    await this.renderer.draw(this.text, id, version, this.db);
  }

  getParser() {
    return this.parser;
  }

  getType() {
    return this.type;
  }
}
