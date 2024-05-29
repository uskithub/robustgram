export interface DiagramDB {
  // db
  clear?: () => void;
  setDiagramTitle?: (title: string) => void;
  getDiagramTitle?: () => string;
  setAccTitle?: (title: string) => void;
  getAccTitle?: () => string;
  setAccDescription?: (description: string) => void;
  getAccDescription?: () => string;
  setDisplayMode?: (title: string) => void;
  bindFunctions?: (element: Element) => void;

  getDirection?: () => string;
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
  parse: (text: string) => void | Promise<void>;
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

export class Diagram {
  public static async fromText(text: string, metadata: DiagramMetadata = {}) {
    console.log("========= fromlllText =========", text);

    const type = "robustive";
    text = encodeEntities(text) + "\n";

    const { db, parser, renderer } = diagrams[type];

    db.clear?.();

    // This block was added for legacy compatibility. Use frontmatter instead of adding more special cases.
    if (metadata.title) {
      db.setDiagramTitle?.(metadata.title);
    }
    await parser.parse(text);
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
    await this.renderer.draw(this.text, id, version, this.db);
  }

  getParser() {
    return this.parser;
  }

  getType() {
    return this.type;
  }
}
