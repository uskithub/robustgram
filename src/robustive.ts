import DOMPurify from "dompurify";
import {
  DiagramDB,
  DiagramDefinition,
  DiagramRenderer,
  ParserDefinition,
} from "./diagram";
// @ts-ignore: JISON doesn't support types
import parser from "./robustive.jison";

type _Relation = {
  type: RobustiveRelationType;
  condition?: string;
  to: _Object;
};

type _Object = {
  type: RobustiveObjectType;
  text: string;
  alias?: string;
  relations: _Relation[];
};

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
  constructor(
    private _type: RobustiveObjectType,
    private _text: string,
    private _alias?: string
  ) {}
  get type(): string {
    return this._type;
  }
  get text(): string {
    return this._text;
  }

  get aliaas(): string | undefined {
    return this._alias;
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
  private _objectMap: {
    actor: Record<string, RobustiveObject>;
    boundary: Record<string, RobustiveObject>;
    controller: Record<string, RobustiveObject>;
    entity: Record<string, RobustiveObject>;
    usecase: Record<string, RobustiveObject>;
  } = {
    actor: {},
    boundary: {},
    controller: {},
    entity: {},
    usecase: {},
  };
  private relations: Relation[] = [];

  get objectMap() {
    return this._objectMap;
  }

  addObject = (
    type: RobustiveObjectType,
    text: string,
    alias?: string
  ): void => {
    switch (type) {
      case RobustiveObjectType.Actor:
        if (this._objectMap.actor[text] !== undefined) return;
        this._objectMap.actor[text] = new RobustiveObject(type, text);
        break;
      case RobustiveObjectType.Boundary:
        if (this._objectMap.boundary[text] !== undefined) return;
        this._objectMap.boundary[text] = new RobustiveObject(type, text);
        break;
      case RobustiveObjectType.Controller:
        if (alias === undefined) return;
        if (this._objectMap.controller[alias] !== undefined) return;
        this._objectMap.controller[alias] = new RobustiveObject(
          type,
          text,
          alias
        );
        break;
      case RobustiveObjectType.Entity:
        if (this._objectMap.entity[text] !== undefined) return;
        this._objectMap.entity[text] = new RobustiveObject(type, text);
        break;
      case RobustiveObjectType.Usecase:
        if (this._objectMap.usecase[text] !== undefined) return;
        this._objectMap.usecase[text] = new RobustiveObject(type, text);
        break;
    }
  };

  setRootDoc = (txt: string): void => {
    console.log("========= setRootDoc =========", txt);
  };

  beginWithActor = (id: string): void => {
    console.log("=== beginWithActor:", id);
  };

  addRelationActorWithBoundary = (
    actorId: string,
    boundaryId: string
  ): void => {
    console.log("=== addRelationActorWithBoundary:", actorId, boundaryId);

    const r = new Relation(RobustiveRelationType.Related, actorId, boundaryId);
    this.relations.push(r);
  };

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
