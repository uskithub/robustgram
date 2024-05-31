import DOMPurify from "dompurify";
import {
  DiagramDB,
  DiagramDefinition,
  DiagramRenderer,
  ParserDefinition,
} from "../diagram";
// @ts-ignore: JISON doesn't support types
import parser from "./stateDiagram.min.jison";
// import parser from "./stateDiagram.jison";

class BaseDiagramDB implements DiagramDB {
  private accTitle: string = "";

  private sanitizeText(text: string): string {
    if (!text) {
      return text;
    }
    text = DOMPurify.sanitize(text, {
      FORBID_TAGS: ["style"],
    }).toString();

    return text;
  }

  /**
   * ※この形でないと、JISON内で呼び出せない
   * @param txt
   */
  setAccTitle = (txt: string): void => {
    this.accTitle = this.sanitizeText(txt).replace(/^\s+/g, "");
  };
}

class StateDB extends BaseDiagramDB {}

class StateRenderer implements DiagramRenderer {
  constructor(private db: DiagramDB) {}
  draw(text: string, id: string, version: string): Promise<void>;
  draw(text: string, id: string, version: string, db: DiagramDB): Promise<void>;
  draw(
    text: string,
    id: string,
    version: string,
    db: DiagramDB = this.db
  ): Promise<void> {
    console.log("========= draw =========", text, id, version, db);
    throw new Error("Method not implemented.");
  }
}

export class StateDiagram implements DiagramDefinition {
  parser: ParserDefinition;
  db: DiagramDB;
  renderer: DiagramRenderer;

  constructor() {
    const db = new StateDB();
    parser.yy = db;
    this.parser = parser;
    this.db = db;
    this.renderer = new StateRenderer(db);
  }
}
