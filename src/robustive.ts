import {
  DiagramDB,
  DiagramDefinition,
  DiagramRenderer,
  ParserDefinition,
} from "./diagram";
// @ts-ignore: JISON doesn't support types
import parser from "./stateDiagram.jison";
// import parser from "./robustive.jison";

class RobustiveDB implements DiagramDB {}

class RobustiveRenderer implements DiagramRenderer {
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

export class RobustiveDiagram implements DiagramDefinition {
  parser: ParserDefinition;
  db: DiagramDB;
  renderer: DiagramRenderer;

  constructor() {
    this.parser = parser;
    const db = new RobustiveDB();
    this.db = db;
    this.renderer = new RobustiveRenderer(db);
  }
}
