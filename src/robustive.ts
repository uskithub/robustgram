import DOMPurify from "dompurify";
import {
  DiagramDB,
  DiagramDefinition,
  DiagramRenderer,
  ParserDefinition,
} from "./diagram";
// @ts-ignore: JISON doesn't support types
import parser from "./robustive.jison";
import { from } from "stylis";

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
    console.log("========= setAccTitle =========", txt);
    this.accTitle = this.sanitizeText(txt).replace(/^\s+/g, "");
  };
}

const RobustiveObjectType = {
  ACTOR: "actor",
  BOUNDARY: "boundary",
  CONTROLLER: "controller",
  ENTITY: "entity",
  USECASE: "usecase",
} as const;

type RobustiveObjectType =
  (typeof RobustiveObjectType)[keyof typeof RobustiveObjectType];

const RobustiveRelationType = {
  RELATED: "related",
  SEQUENTIAL: "sequential",
  CONDITIONAL: "conditional",
} as const;

type RobustiveRelationType =
  (typeof RobustiveRelationType)[keyof typeof RobustiveRelationType];

class RobustiveObject {
  constructor(private _type: RobustiveObjectType, private _id: string) {}
  get type(): string {
    return this._type;
  }
  get id(): string {
    return this._id;
  }
}
class Relation {
  constructor(
    private _type: RobustiveRelationType,
    private _from: string,
    private _to: string,
    private _condition?: string
  ) {}

  get type(): string {
    return this._type;
  }
  get from(): string {
    return this._from;
  }
  get to(): string {
    return this._to;
  }
  get condition(): string | undefined {
    return this._condition;
  }
}

class RobustiveDB extends BaseDiagramDB {
  private idMap: Record<string, RobustiveObject> = {};
  private relations: Relation[] = [];

  setRootDoc = (txt: string): void => {
    console.log("========= setRootDoc =========", txt);
  };

  beginWithActor(id: string): void {
    console.log("=== beginWithActor:", id);
    const a = new RobustiveObject(RobustiveObjectType.ACTOR, id);
    this.idMap[id] = a;
  }

  addRelationActorWithBoundary(actorId: string, boundaryId: string): void {
    console.log("=== addRelationActorWithBoundary:", actorId, boundaryId);
    const b = new RobustiveObject(RobustiveObjectType.BOUNDARY, boundaryId);
    this.idMap[boundaryId] = b;

    const r = new Relation(RobustiveRelationType.RELATED, actorId, boundaryId);
    this.relations.push(r);
  }

  addRelationBounderyWithController(
    boundaryId: string,
    condition: string,
    controllerId: string
  ): void {
    console.log("=== addRelationWithController:", boundaryId, controllerId);
    const c = new RobustiveObject(RobustiveObjectType.CONTROLLER, controllerId);
    this.idMap[controllerId] = c;

    const r = new Relation(
      RobustiveRelationType.CONDITIONAL,
      boundaryId,
      controllerId,
      condition
    );
    this.relations.push(r);
  }

  addRelationControllerWithController(
    boundaryId: string,
    controllerId: string
  ): void {
    console.log(
      "=== addRelationBoundaryAithController:",
      boundaryId,
      controllerId
    );
    const c = new RobustiveObject(RobustiveObjectType.CONTROLLER, controllerId);
    this.idMap[controllerId] = c;

    const r = new Relation(boundaryId, controllerId);
    this.relations.push(r);
  }
}

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
    const db = new RobustiveDB();
    parser.yy = db;
    this.parser = parser;
    this.db = db;
    this.renderer = new RobustiveRenderer(db);
  }
}
