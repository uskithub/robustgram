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
import * as dagre from "dagre";
import * as d3 from "d3";
import {
  drawArrow,
  drawBoundary,
  drawController,
  drawEntity,
  drawUsecase,
} from "./shapes";
import { H } from "vitest/dist/reporters-yx5ZTtEV.js";

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

type ColorConfig = {
  font: string;
  stroke: string;
  label: string;
};

const DisplayMode = {
  Dark: "dark",
  Light: "light",
} as const;

type DisplayMode = (typeof DisplayMode)[keyof typeof DisplayMode];

const BASE_STROKE_WIDTH = 1;

type RobustiveNode = {
  objectType: RobustiveObjectType;
  x?: number;
  y?: number;
  label?: string;
  explanation?: string;
};

class RobustiveRenderer implements DiagramRenderer {
  static Intersector = {
    ellipse: function (
      node: any,
      rx: number,
      ry: number,
      point: { x: number; y: number }
    ) {
      // Formulae from: http://mathworld.wolfram.com/Ellipse-LineIntersection.html

      const cx = node.x;
      const cy = node.y;

      const px = cx - point.x;
      const py = cy - point.y;

      const det = Math.sqrt(rx * rx * py * py + ry * ry * px * px);

      let dx = Math.abs((rx * ry * px) / det);
      if (point.x < cx) {
        dx = -dx;
      }
      let dy = Math.abs((rx * ry * py) / det);
      if (point.y < cy) {
        dy = -dy;
      }

      return { x: cx + dx, y: cy + dy };
    },
    circle: function (
      node: any,
      radius: number,
      point: { x: number; y: number }
    ) {
      return RobustiveRenderer.Intersector.ellipse(node, radius, radius, point);
    },
    rect: function (node: any, point: { x: number; y: number }) {
      const x = node.x;
      const y = node.y;

      // Rectangle intersection algorithm from:
      // http://math.stackexchange.com/questions/108113/find-edge-between-two-boxes
      const dx = point.x - x;
      const dy = point.y - y;
      let w = node.width / 2;
      let h = node.height / 2;

      let sx, sy;
      if (Math.abs(dy) * w > Math.abs(dx) * h) {
        // Intersection is top or bottom of rect.
        if (dy < 0) {
          h = -h;
        }
        sx = dy === 0 ? 0 : (h * dx) / dy;
        sy = h;
      } else {
        // Intersection is left or right of rect.
        if (dx < 0) {
          w = -w;
        }
        sx = w;
        sy = dx === 0 ? 0 : (w * dy) / dx;
      }

      return { x: x + sx, y: y + sy };
    },
  };

  constructor() {}

  private detectDisplayMode(): DisplayMode {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? DisplayMode.Dark
      : DisplayMode.Light;
  }

  private renderActor(
    selection: d3.Selection<
      SVGGElement,
      dagre.Node<RobustiveNode>,
      null,
      undefined
    >
  ) {
    const radius = 16;
    const adjust_y = -20;

    const strokeColor =
      this.detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

    selection
      .append<SVGCircleElement>("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", strokeColor)
      .attr("stroke-width", BASE_STROKE_WIDTH);

    const neck = radius * 1.8;
    const body = radius * 3.2;

    selection
      .append("path")
      .attr(
        "d",
        d3.line()([
          [-radius * 1.6, radius * 1.6],
          [0, neck],
          [0, radius],
          [0, body],
          [-radius * 1.4, radius * 5],
          [0, body],
          [radius * 1.4, radius * 5],
          [0, body],
          [0, neck],
          [radius * 1.6, radius * 1.6],
        ])
      )
      .attr("stroke", strokeColor)
      .attr("fill", "none")
      .attr("stroke-width", BASE_STROKE_WIDTH);

    selection
      .append<SVGTextElement>("text")
      .attr("y", 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", strokeColor)
      .text((node) => node.label || "");
  }

  private renderController(
    selection: d3.Selection<
      SVGGElement,
      dagre.Node<RobustiveNode>,
      null,
      undefined
    >
  ) {
    const radius = 50;
    const arrow_size = radius / 3;

    const strokeColor =
      this.detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

    selection
      .append<SVGCircleElement>("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", strokeColor)
      .attr("stroke-width", BASE_STROKE_WIDTH);

    selection
      .append("path")
      .attr(
        "d",
        d3.line()([
          [arrow_size, -(radius + arrow_size / 2)],
          [0, -radius],
          [arrow_size, -(radius - arrow_size / 2)],
        ])
      )
      .attr("stroke", strokeColor)
      .attr("fill", "none")
      .attr("stroke-width", BASE_STROKE_WIDTH);

    selection
      .append<SVGTextElement>("text")
      .attr("y", 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", strokeColor)
      .text((node) => node.label || "");
  }

  private renderEntity(
    selection: d3.Selection<
      SVGGElement,
      dagre.Node<RobustiveNode>,
      null,
      undefined
    >
  ) {
    const radius = 50;

    const strokeColor =
      this.detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

    selection
      .append<SVGCircleElement>("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", strokeColor)
      .attr("stroke-width", BASE_STROKE_WIDTH);

    selection
      .append("path")
      .attr(
        "d",
        d3.line()([
          [(radius / 10) * 9, radius],
          [(-radius / 10) * 9, radius],
        ])
      )
      .attr("stroke", strokeColor)
      .attr("fill", "none")
      .attr("stroke-width", BASE_STROKE_WIDTH);

    selection
      .append<SVGTextElement>("text")
      .attr("y", 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", strokeColor)
      .text((node) => node.label || "");
  }

  private renderBoundary(
    selection: d3.Selection<
      SVGGElement,
      dagre.Node<RobustiveNode>,
      null,
      undefined
    >
  ) {
    const radius = 50;
    const gap = (radius / 10) * 3;

    const strokeColor =
      this.detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

    selection
      .append<SVGCircleElement>("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", strokeColor)
      .attr("stroke-width", BASE_STROKE_WIDTH);

    selection
      .append("path")
      .attr(
        "d",
        d3.line()([
          [-(radius + gap), (radius / 10) * 8],
          [-(radius + gap), (-radius / 10) * 8],
          [-(radius + gap), 0],
          [-radius, 0],
        ])
      )
      .attr("stroke", strokeColor)
      .attr("fill", "none")
      .attr("stroke-width", BASE_STROKE_WIDTH);

    selection
      .append<SVGTextElement>("text")
      .attr("y", 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", strokeColor)
      .text((node) => node.label || "");
  }

  private renderUsecase(
    selection: d3.Selection<
      SVGGElement,
      dagre.Node<RobustiveNode>,
      null,
      undefined
    >
  ) {
    const radius = 50;
    const rx = radius * 1.6;
    const ry = radius * 1.1;

    const strokeColor =
      this.detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

    selection
      .append<SVGEllipseElement>("ellipse")
      .attr("rx", rx)
      .attr("ry", ry)
      .attr("fill", "none")
      .attr("stroke", strokeColor)
      .attr("stroke-width", BASE_STROKE_WIDTH);

    selection
      .append<SVGTextElement>("text")
      .attr("y", 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", strokeColor)
      .text((node) => node.label || "");
  }

  private recursiveAddToGraph(
    g: dagre.graphlib.Graph<RobustiveNode>,
    obj: RobustiveObject,
    depth: number = 0,
    colorConfig: ColorConfig = this.detectDisplayMode() === DisplayMode.Dark
      ? { font: "black", stroke: "white", label: "white" }
      : { font: "white", stroke: "black", label: "black" }
  ): Edge[] {
    const from = obj.alias ?? obj.text;
    const node: RobustiveNode = {
      objectType: obj.type,
      x: 0,
      y: 99,
      label: from,
    };
    g.setNode(from, node);

    return (
      obj.relations?.reduce((edges, relation) => {
        const nextObj = relation.to;
        let to: string;

        if (typeof nextObj === "object") {
          edges = edges.concat(
            this.recursiveAddToGraph(g, relation.to, depth + 1, colorConfig)
          );
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
              arrowheadStyle: `fill: ${colorConfig.stroke}`,
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
              arrowheadStyle: `fill: ${colorConfig.stroke}`,
              label: relation.condition,
              labelStyle: `fill: ${colorConfig.label};`,
              relation,
            },
            name
          );
        }
        return edges;
      }, new Array<Edge>()) ?? new Array<Edge>()
    );
  }

  private renderGraph(
    parent: d3.Selection<
      SVGGElement,
      dagre.Node<RobustiveNode>,
      HTMLElement,
      any
    >,
    g: dagre.graphlib.Graph<RobustiveNode>,
    edges: Edge[]
  ) {
    const _self = this;

    // ノードを描画
    const nodes = parent
      .selectAll()
      .data(
        g.nodes().map((id) => {
          const node = g.node(id);
          node.width = 100;
          node.height = 100;
          return node;
        })
      )
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (node) => {
        return `translate(${node.x - node.width / 2},${
          node.y - node.height / 2
        })`;
      })
      .each(function (node) {
        // Do not use arrow function because of `this`
        const selection = d3.select<SVGGElement, dagre.Node<RobustiveNode>>(
          this
        );

        switch (node.objectType) {
          case RobustiveObjectType.Actor: {
            _self.renderActor(selection);
            break;
          }
          case RobustiveObjectType.Boundary: {
            _self.renderBoundary(selection);
            break;
          }
          case RobustiveObjectType.Controller: {
            _self.renderController(selection);
            break;
          }
          case RobustiveObjectType.Entity: {
            _self.renderEntity(selection);
            break;
          }
          case RobustiveObjectType.Usecase: {
            _self.renderUsecase(selection);
            break;
          }
        }
      });

    // エッジを描画
    const _edges = parent
      .selectAll()
      .data(g.edges())
      .enter()
      .append("g")
      .attr("class", "edge")
      .each(function (node) {
        // Do not use arrow function because of `this`
        const edgeObj = g.edge(node);
        const selection = d3.select<SVGGElement, dagre.Node<RobustiveNode>>(
          this
        );

        const points = edgeObj.points as Array<{ x: number; y: number }>;
        const overridePoints = [points[0], points[points.length - 1]];

        // カスタムエッジのパスを定義
        const line = d3
          .line<{ x: number; y: number }>()
          .x((d) => d.x)
          .y((d) => d.y)
          .curve(d3.curveLinear); // 直線

        const pathData = line(overridePoints);

        selection
          .append("path")
          .attr("d", pathData)
          .attr("stroke", "red")
          .attr("stroke-width", 2);
      });
  }

  draw(
    text: string,
    id: string,
    version: string,
    parseResult: ParseResult
  ): void {
    console.log("========= start draw =========", id);
    console.log("text:", text);
    console.log("parseResult:", parseResult);

    const g = new dagre.graphlib.Graph<RobustiveNode>({
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

    const edges = this.recursiveAddToGraph(
      g,
      (parseResult as RobustiveParseResult).scenario
    );

    // レイアウト計算
    dagre.layout(g);

    console.log("***", g);

    g.nodes().forEach((id) => {
      const node = g.node(id);
      console.log("***", node);
    });

    /**
     * A D3 Selection of elements.
     *
     * The first generic "GElement" refers to the type of the selected element(s).
     * The second generic "Datum" refers to the type of the datum of a selected element(s).
     * The third generic "PElement" refers to the type of the parent element(s) in the D3 selection.
     * The fourth generic "PDatum" refers to the type of the datum of the parent element(s).
     */

    const root = d3.select<HTMLElement, dagre.Node<RobustiveNode>>("body");
    const svg = root.select<SVGGraphicsElement>(`[id="${id}"]`);
    const gElem = root.select<SVGGElement>("#" + id + " g");

    // Run the renderer. This is what draws the final graph.
    this.renderGraph(gElem, g, edges);

    // configure svg size
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
