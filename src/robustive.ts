import DOMPurify from "dompurify";
import {
  DiagramDB,
  DiagramDefinition,
  DiagramRenderer,
  ParserDefinition,
} from "./diagram";
// @ts-ignore: JISON doesn't support types
import parser from "./robustive.jison";

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
  Actor: "actor",
  Boundary: "boundary",
  Controller: "controller",
  Entity: "entity",
  Usecase: "usecase",
} as const;

type RobustiveObjectType =
  (typeof RobustiveObjectType)[keyof typeof RobustiveObjectType];

const RobustiveRelationType = {
  Related: "related",
  Sequential: "sequential",
  Conditional: "conditional",
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
    const a = new RobustiveObject(RobustiveObjectType.Actor, id);
    this.idMap[id] = a;
  }

  addRelationActorWithBoundary(actorId: string, boundaryId: string): void {
    console.log("=== addRelationActorWithBoundary:", actorId, boundaryId);

    const r = new Relation(RobustiveRelationType.Related, actorId, boundaryId);
    this.relations.push(r);

    if (this.idMap[boundaryId] !== undefined) return;

    const b = new RobustiveObject(RobustiveObjectType.Boundary, boundaryId);
    this.idMap[boundaryId] = b;
  }

  addRelationBounderyWithController(
    boundaryId: string,
    controllerId: string,
    condition: string
  ): void {
    console.log(
      "=== addRelationBounderyWithController:",
      boundaryId,
      controllerId
    );

    const r = new Relation(
      RobustiveRelationType.Conditional,
      boundaryId,
      controllerId,
      condition
    );
    this.relations.push(r);

    if (this.idMap[controllerId] !== undefined) return;

    const c = new RobustiveObject(RobustiveObjectType.Controller, controllerId);
    this.idMap[controllerId] = c;
  }

  addRelationBounderyWithUsecase(
    boundaryId: string,
    usecaseId: string,
    condition: string
  ): void {
    console.log("=== addRelationBounderyWithUsecase:", boundaryId, usecaseId);

    const r = new Relation(
      RobustiveRelationType.Conditional,
      boundaryId,
      usecaseId,
      condition
    );
    this.relations.push(r);

    if (this.idMap[usecaseId] !== undefined) return;

    const u = new RobustiveObject(RobustiveObjectType.Controller, usecaseId);
    this.idMap[usecaseId] = u;
  }

  addRelationControllerWithController(
    fromId: string,
    toId: string,
    condition: string | undefined
  ): void {
    console.log("=== addRelationControllerWithController:", fromId, toId);

    const r = new Relation(
      condition
        ? RobustiveRelationType.Conditional
        : RobustiveRelationType.Sequential,
      fromId,
      toId,
      condition
    );
    this.relations.push(r);

    if (this.idMap[toId] !== undefined) return;

    const c = new RobustiveObject(RobustiveObjectType.Controller, toId);
    this.idMap[toId] = c;
  }

  addRelationControllerWithUsecase(
    controllerId: string,
    usecaseId: string,
    condition: string | undefined
  ): void {
    console.log(
      "=== addRelationControllerWithUsecase:",
      controllerId,
      usecaseId
    );

    const r = new Relation(
      condition
        ? RobustiveRelationType.Conditional
        : RobustiveRelationType.Sequential,
      controllerId,
      usecaseId,
      condition
    );
    this.relations.push(r);

    if (this.idMap[usecaseId] !== undefined) return;

    const u = new RobustiveObject(RobustiveObjectType.Controller, usecaseId);
    this.idMap[usecaseId] = u;
  }

  addRelationControllerWithBoundary(
    controllerId: string,
    boundaryId: string
  ): void {
    console.log(
      "=== addRelationControllerWithBoundary:",
      controllerId,
      boundaryId
    );

    const r = new Relation(
      RobustiveRelationType.Sequential,
      controllerId,
      boundaryId
    );
    this.relations.push(r);

    if (this.idMap[boundaryId] !== undefined) return;

    const b = new RobustiveObject(RobustiveObjectType.Boundary, boundaryId);
    this.idMap[boundaryId] = b;
  }

  addRelationUsecaseWithBoundary(usecaseId: string, boundaryId: string): void {
    console.log(
      "=== addRelationControllerWithBoundary:",
      usecaseId,
      boundaryId
    );

    const r = new Relation(
      RobustiveRelationType.Sequential,
      usecaseId,
      boundaryId
    );
    this.relations.push(r);

    if (this.idMap[boundaryId] !== undefined) return;

    const b = new RobustiveObject(RobustiveObjectType.Boundary, boundaryId);
    this.idMap[boundaryId] = b;
  }

  addRelationControllerWithEntity(
    controllerId: string,
    entityId: string
  ): void {
    console.log("=== addRelationControllerWithEntity:", controllerId, entityId);

    const r = new Relation(
      RobustiveRelationType.Related,
      controllerId,
      entityId
    );
    this.relations.push(r);

    if (this.idMap[entityId] !== undefined) return;

    const e = new RobustiveObject(RobustiveObjectType.Entity, entityId);
    this.idMap[entityId] = e;
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
