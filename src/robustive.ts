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
import * as d3 from "d3";
import {
  DisplayMode,
  detectDisplayMode,
  drawActor,
  drawBoundary,
  drawController,
  drawEntity,
  drawUsecase,
} from "./shapes";

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
  relations?: RobustiveRelation[];
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

type Edge = {
  from: string;
  to: string;
  type: RobustiveRelationType;
};

class RobustiveRenderer implements DiagramRenderer {
  constructor() {}
  draw(
    text: string,
    id: string,
    version: string,
    parseResult: ParseResult
  ): void {
    console.log("========= start draw =========");
    console.log("text:", text);
    console.log("parseResult:", parseResult);

    const g = new graphlib.Graph({
      multigraph: true,
      compound: true,
    }).setGraph({
      nodesep: 50,
      ranksep: 50,
      marginx: 8,
      marginy: 8,
    });

    g.graph().rankdir = "LR";

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(() => {
      return {};
    });

    const [fontColor, strokeColor, labelColor] =
      detectDisplayMode() === DisplayMode.Dark
        ? ["black", "white", "white"]
        : ["white", "black", "black"];

    const _draw = (obj: RobustiveObject): Edge[] => {
      const from = obj.alias ?? obj.text;
      g.setNode(from, {
        shape: obj.type,
      });

      return (
        obj.relations?.reduce((edges, relation) => {
          const nextObj = relation.to;
          let to: string;
          if (typeof nextObj === "object") {
            edges = edges.concat(_draw(relation.to));
            to = nextObj.alias ?? nextObj.text;
          } else {
            to = nextObj;
          }

          edges.push({ from, to, type: relation.type });
          const name = `${from}_${relation.type}_${to}`;
          if (relation.type === RobustiveRelationType.Related) {
            g.setEdge(
              from,
              to,
              {
                // style: `stroke: ${strokeColor}; fill:none; stroke-width: 1px;`,
                style: `stroke: red; fill:none; stroke-width: 2px;`,
                arrowhead: "undirected",
                relation,
              },
              name
            );
          } else if (relation.type === RobustiveRelationType.Sequential) {
            g.setEdge(
              from,
              to,
              {
                // style: `stroke: ${strokeColor}; fill:none; stroke-width: 1px;`,
                style: `stroke: red; fill:none; stroke-width: 2px;`,
                arrowhead: "vee",
                arrowheadStyle: `fill: ${strokeColor}`,
                relation,
              },
              name
            );
          } else {
            g.setEdge(
              from,
              to,
              {
                curve: d3.curveLinear,
                // style: `stroke: ${strokeColor}; fill:none; stroke-width: 1px;`,
                style: `font-color:white;stroke: red; fill:none; stroke-width: 2px;`,
                arrowhead: "vee",
                arrowheadStyle: `fill: ${strokeColor}`,
                label: relation.condition,
                labelStyle: `fill: ${labelColor};`,
                relation,
              },
              name
            );
          }
          return edges;
        }, new Array<Edge>()) ?? new Array<Edge>()
      );
    };

    const edges = _draw((parseResult as RobustiveParseResult).scenario);

    const root = d3.select("body");
    const svg = root.select<SVGGraphicsElement>(`[id="${id}"]`);
    const element = root.select("#" + id + " g");

    // Create the renderer
    const r = new render();
    const shapes = r.shapes();
    shapes.actor = drawActor;
    shapes.controller = drawController;
    shapes.entity = drawEntity;
    shapes.boundary = drawBoundary;
    shapes.usecase = drawUsecase;

    // Run the renderer. This is what draws the final graph.
    r(element, g);

    edges.forEach((edge) => {
      const edgeObj = g.edge(
        edge.from,
        edge.to,
        `${edge.from}_${edge.type}_${edge.to}`
      );

      // TODO
      console.log("edgeObj", edgeObj);
    });

    // configutr svg size
    const node = svg.node();
    if (node === null) {
      return;
    }
    const padding = 8;
    const bounds = node.getBBox();
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;

    svg.attr("height", height);
    svg.attr("width", width);

    const vBox = `${bounds.x - padding} ${
      bounds.y - padding
    } ${width} ${height}`;
    console.log(`viewBox ${vBox}`);
    svg.attr("viewBox", vBox);
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
