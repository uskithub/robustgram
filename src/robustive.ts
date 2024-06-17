import DOMPurify from "dompurify";
import {
  DiagramDB,
  DiagramDefinition,
  DiagramRenderer,
  ParseErrorDetail,
  ParseResult,
  ParserDefinition,
} from "./diagram";
// @ts-ignore: JISON doesn't support types
import parser from "./robustive.jison";
import { graphlib, render } from "dagre-d3-es";
import { curveBasis, select } from "d3";
import { drawActor, drawBoundary, drawControl, drawEntity } from "./shapes";

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
  private _hasError: boolean = false;

  set hasError(value: boolean) {
    this._hasError = value;
  }

  get hasError(): boolean {
    return this._hasError;
  }

  // JISON内では this が適切に設定されていないためか、getter/setter が使えない
  markAsError = (): void => {
    this.hasError = true;
  };

  getErrorState = (): boolean => {
    return this.hasError;
  };

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
  constructor() {}
  draw(
    text: string,
    id: string,
    version: string,
    parseResult: ParseResult
  ): Promise<void> {
    console.log("========= start draw =========");
    console.log("text:", text);
    console.log("id:", id);
    console.log("version:", version);
    console.log("parseResult:", parseResult);

    const g = new graphlib.Graph({
      multigraph: true,
      compound: true,
    }).setGraph({});

    // g.graph().rankdir = "LR";

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(() => {
      return {};
    });

    // const _draw = (obj: RobustiveObject): void => {};

    // _draw(parseResult.scenario);

    g.setNode("root", {
      label: "",
      width: 70,
      height: 60,
      shape: "actor",
      style: "stroke: black; stroke-width: 1px; ",
      labelStyle: "font: 300 14px 'Helvetica Neue', Helvetica;fill: white;",
    });

    g.setNode("put", {
      label: "PUT",
      width: 50,
      height: 20,
      shape: "actor",
      style: "stroke: black; fill:blue; stroke-width: 1px; ",
      labelStyle: "font: 300 14px 'Helvetica Neue', Helvetica;fill: white;",
    });

    // g.setEdge("root", "put", {
    //   curve: curveBasis,
    //   style:
    //     "stroke: blue; fill:none; stroke-width: 1px; stroke-dasharray: 5, 5;",
    //   arrowheadStyle: "fill: blue",
    // });

    // g.setNode("cdt", {
    //   label: "CDT",
    //   width: 50,
    //   height: 20,
    //   shape: "control",
    // });

    // g.setEdge("root", "cdt", {
    //   curve: curveBasis,
    //   style:
    //     "stroke: gray; fill:none; stroke-width: 1px; stroke-dasharray: 5, 5;",
    //   arrowheadStyle: "fill: gray",
    // });

    const root = select("body");
    const svg = root.select(`[id="${id}"]`);
    const element = root.select("#" + id + " g");

    // Create the renderer
    const r = new render();
    r.shapes().actor = drawActor;
    r.shapes().control = drawControl;
    r.shapes().entity = drawEntity;
    r.shapes().boundary = drawBoundary;

    // Run the renderer. This is what draws the final graph.
    r(element, g);
  }
}
export interface RobustiveParseResult extends ParseResult {
  scenario: RobustiveObject;
  hasError: boolean;
}

export class RobustiveDiagram implements DiagramDefinition {
  parser: ParserDefinition;
  db: RobustiveDB;
  renderer: DiagramRenderer;

  constructor() {
    const db = new RobustiveDB();
    parser.yy = db;
    this.parser = parser;
    this.db = db;
    this.renderer = new RobustiveRenderer();
  }

  clear(): void {
    this.db.clear();
  }

  parse(text: string): Promise<RobustiveParseResult> {
    return new Promise((resolve, reject) => {
      try {
        const parseResult = this.parser.parse(text) as RobustiveParseResult;
        resolve(parseResult);
      } catch (e) {
        reject(e);
      }
    });
  }
}
