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
  DisplayMode,
  detectDisplayMode,
  drawActor,
  drawArrow,
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

type ColorConfig = {
  font: string;
  stroke: string;
  label: string;
};

class RobustiveRenderer implements DiagramRenderer {
  constructor() {}

  private recursiveAddToGraph<T>(
    g: dagre.graphlib.Graph<T>,
    obj: RobustiveObject,
    colorConfig: ColorConfig = detectDisplayMode() === DisplayMode.Dark
      ? { font: "black", stroke: "white", label: "white" }
      : { font: "white", stroke: "black", label: "black" }
  ): Edge[] {
    const from = obj.alias ?? obj.text;
    g.setNode(from, {
      shape: obj.type,
    });

    let group: string | undefined;
    return (
      obj.relations?.reduce((edges, relation) => {
        const nextObj = relation.to;
        let to: string;

        if (typeof nextObj === "object") {
          edges = edges.concat(
            this.recursiveAddToGraph(g, relation.to, colorConfig)
          );
          to = nextObj.alias ?? nextObj.text;
        } else {
          to = nextObj;
        }

        edges.push({ from, to, type: relation.type });
        const name = `${from}_${relation.type}_${to}`;
        if (relation.type === RobustiveRelationType.Related) {
          if (
            obj.type === RobustiveObjectType.Controller &&
            nextObj.type === RobustiveObjectType.Entity
          ) {
            // if (group) {
            //   g.setParent(to, group);
            // } else {
            //   group = `group_${from}`;
            //   g.setNode(group, {});
            //   g.setParent(from, group);
            //   g.setParent(to, group);
            // }
          }
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

  private renderGraph<T>(
    parent: d3.Selection<SVGGElement, unknown, HTMLElement, undefined>,
    g: dagre.graphlib.Graph<T>,
    edges: Edge[]
  ) {
    // エッジを描画
    const _edges = parent
      .selectAll(".edge")
      .data(g.edges())
      .enter()
      .append("g")
      .attr("class", "edge");

    _edges
      .append("path")
      .attr("class", "edgePath")
      .attr("d", (d) => {
        const points = g.edge(d).points;
        const line = d3
          .line()
          .x((d) => d.x)
          .y((d) => d.y);

        return line(points);
      });

    // ノードを描画
    const _nodes = parent
      .selectAll(".node")
      .data(g.nodes())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => {
        const node = g.node(d);
        return `translate(${node.x - node.width / 2},${
          node.y - node.height / 2
        })`;
      });

    _nodes
      .append("rect")
      .attr("width", (d) => g.node(d).width)
      .attr("height", (d) => g.node(d).height);

    _nodes
      .append("text")
      .attr("x", (d) => g.node(d).width / 2)
      .attr("y", (d) => g.node(d).height / 2)
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .text((d) => g.node(d).label);

    // カスタムエッジの描画
    // @see: https://dagrejs.github.io/project/dagre-d3/latest/demo/user-defined.html

    edges.forEach((edge) => {
      const edgeObj = g.edge(
        edge.from,
        edge.to,
        `${edge.from}_${edge.type}_${edge.to}`
      );

      console.log("edgeObj", edgeObj);

      const points = edgeObj.points as Array<{ x: number; y: number }>;
      const overridePoints = [points[0], points[points.length - 1]];
      // カスタムエッジのパスを定義
      const line = d3
        .line<{ x: number; y: number }>()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(d3.curveLinear); // 直線

      const pathData = line(overridePoints);

      console.log(`外 ${edge.from}_${edge.type}_${edge.to}`, pathData);

      // エッジパスを更新（現状追加になっている）
      parent
        .append("path")
        .attr("d", pathData)
        .attr("stroke", "blue")
        .attr("stroke-width", 2);
    });
  }

  draw(
    text: string,
    id: string,
    version: string,
    parseResult: ParseResult
  ): void {
    console.log("========= start draw =========");
    console.log("text:", text);
    console.log("parseResult:", parseResult);

    const g = new dagre.graphlib.Graph({
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

    const root = d3.select("body");
    const svg = root.select<SVGGraphicsElement>(`[id="${id}"]`);
    const element = root.select<SVGGElement>("#" + id + " g");

    // Run the renderer. This is what draws the final graph.
    this.renderGraph(element, g, edges);

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
