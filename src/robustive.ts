import DOMPurify from "dompurify";
import {
  DiagramDB,
  DiagramDefinition,
  DiagramRenderer,
  ParseErrorDetail,
  ParserDefinition,
} from "./diagram";
// @ts-ignore: JISON doesn't support types
import parser from "./robustive.jison";

type RobustiveRelation = {
  type: RobustiveRelationType;
  condition?: string;
  to: RobustiveObject;
  violating?: string;
};

type RobustiveObject = {
  type: RobustiveObjectType;
  text: string;
  alias?: string;
  violating?: string;
  relations: RobustiveRelation[];
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

export const RobustiveObjectType = {
  Actor: "actor",
  Boundary: "boundary",
  Controller: "controller",
  Entity: "entity",
  Usecase: "usecase",
} as const;

export type RobustiveObjectType =
  (typeof RobustiveObjectType)[keyof typeof RobustiveObjectType];

export const RobustiveRelationType = {
  Related: "related",
  Sequential: "sequential",
  Conditional: "conditional",
} as const;

export type RobustiveRelationType =
  (typeof RobustiveRelationType)[keyof typeof RobustiveRelationType];

class _Object {
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
export class RobustiveParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RobustiveParseError";
    Object.setPrototypeOf(this, RobustiveParseError.prototype);
  }
}

export class RobustiveParseSyntaxError extends Error {
  constructor(message: string, private _detail: ParseErrorDetail) {
    super(message);
    this.name = "RobustiveParseSyntaxError";
    Object.setPrototypeOf(this, RobustiveParseSyntaxError.prototype);
  }

  get detail(): ParseErrorDetail {
    return this._detail;
  }
}

class RobustiveDB extends BaseDiagramDB {
  private relations: Relation[] = [];
  private _hasError: boolean = false;

  set hasError(value: boolean) {
    this._hasError = value;
  }

  clear = (): void => {
    this._hasError = false;
  };

  console = {
    log: (message?: any, ...optionalParams: any[]): void => {
      console.log(message, ...optionalParams);
    },
  };

  /**
   * 握り潰そうとすると、解析OKの体で進んでしまい、別のエラーになる
   * @param message
   * @param hash
   */
  parseError = (message: string, hash?: ParseErrorDetail): void => {
    if (hash === undefined) {
      throw new RobustiveParseError(message);
    }

    throw new RobustiveParseSyntaxError(
      "Syntax error at line " +
        hash.line +
        ", column " +
        hash.loc.first_column +
        ": " +
        message,
      hash
    );
  };
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
    console.log("========= start draw =========");
    console.log("text:", text);
    console.log("id:", id);
    console.log("version:", version);
    console.log("db:", db);
    throw new Error("Method not implemented.");
  }
}
export type RobustiveParseResult = {
  scenario: RobustiveObject;
  hasError: boolean;
};

export class RobustiveDiagram implements DiagramDefinition {
  parser: ParserDefinition;
  db: RobustiveDB;
  renderer: DiagramRenderer;

  constructor() {
    const db = new RobustiveDB();
    parser.yy = db;
    this.parser = parser;
    this.db = db;
    this.renderer = new RobustiveRenderer(db);
  }

  clear(): void {
    this.db.clear();
  }

  // TODO: parseの型を決める
  parse(text: string): Promise<RobustiveParseResult> {
    return new Promise((resolve, reject) => {
      try {
        const parseResult = this.parser.parse(text);
        resolve(parseResult);
      } catch (e) {
        reject(e);
      }
    });
  }
}
