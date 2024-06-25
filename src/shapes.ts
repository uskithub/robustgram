import * as d3 from "d3";

const BASE_STROKE_WIDTH = 1;

export const DisplayMode = {
  Dark: "dark",
  Light: "light",
} as const;

export type DisplayMode = (typeof DisplayMode)[keyof typeof DisplayMode];

export function detectDisplayMode(): DisplayMode {
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DisplayMode.Dark
    : DisplayMode.Light;
}

const Intersector = {
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
    return Intersector.ellipse(node, radius, radius, point);
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

export const drawActor = (
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  bbox: { width: number; height: number },
  node: any
): d3.Selection<SVGGElement, unknown, null, undefined> => {
  // デフォルトのラベル要素を削除
  parent.selectAll("g.label").remove();

  const radius = 16;
  const adjust_y = -20;

  const strokeColor =
    detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

  const group = parent
    .append<SVGGElement>("g")
    .attr("transform", `translate(0, ${adjust_y})`);

  group
    .append<SVGCircleElement>("circle")
    .attr("r", radius)
    .attr("fill", "none")
    .attr("stroke", strokeColor)
    .attr("stroke-width", BASE_STROKE_WIDTH);

  const neck = radius * 1.8;
  const body = radius * 3.2;
  group
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

  group
    .append<SVGTextElement>("text")
    .attr("y", 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("fill", strokeColor)
    .text(node.label);

  node.intersect = (point: { x: number; y: number }) => {
    return Intersector.rect(node, point);
  };

  return group;
};

export const drawController = (
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  bbox: { width: number; height: number },
  node: any
): d3.Selection<SVGGElement, unknown, null, undefined> => {
  // デフォルトのラベル要素を削除
  parent.selectAll("g.label").remove();

  const radius = 50;
  const arrow_size = radius / 3;

  const strokeColor =
    detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

  const group = parent.append<SVGGElement>("g");

  group
    .append<SVGCircleElement>("circle")
    .attr("r", radius)
    .attr("fill", "none")
    .attr("stroke", strokeColor)
    .attr("stroke-width", BASE_STROKE_WIDTH);

  group
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

  group
    .append<SVGTextElement>("text")
    .attr("y", 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("fill", strokeColor)
    .text(node.label);

  node.intersect = (point: { x: number; y: number }) => {
    return Intersector.circle(node, radius, point);
  };

  return group;
};

export const drawEntity = (
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  bbox: { width: number; height: number },
  node: any
): d3.Selection<SVGGElement, unknown, null, undefined> => {
  // デフォルトのラベル要素を削除
  parent.selectAll("g.label").remove();

  const radius = 50;

  const strokeColor =
    detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

  const group = parent.append<SVGGElement>("g");

  group
    .append<SVGCircleElement>("circle")
    .attr("r", radius)
    .attr("fill", "none")
    .attr("stroke", strokeColor)
    .attr("stroke-width", BASE_STROKE_WIDTH);

  group
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

  group
    .append<SVGTextElement>("text")
    .attr("y", 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("fill", strokeColor)
    .text(node.label);

  node.intersect = (point: { x: number; y: number }) => {
    return Intersector.circle(node, radius, point);
  };

  return group;
};

export const drawBoundary = (
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  bbox: { width: number; height: number },
  node: any
): d3.Selection<SVGGElement, unknown, null, undefined> => {
  // デフォルトのラベル要素を削除
  parent.selectAll("g.label").remove();

  const radius = 50;
  const gap = (radius / 10) * 3;
  const strokeColor =
    detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

  const group = parent.append<SVGGElement>("g");
  group
    .append<SVGCircleElement>("circle")
    .attr("r", radius)
    .attr("fill", "none")
    .attr("stroke", strokeColor)
    .attr("stroke-width", BASE_STROKE_WIDTH);

  group
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

  group
    .append<SVGTextElement>("text")
    .attr("y", 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("fill", strokeColor)
    .text(node.label);

  node.intersect = (point: { x: number; y: number }) => {
    const cx = node.x - gap / 2;
    const cy = node.y;

    // Rectangle intersection algorithm from:
    // http://math.stackexchange.com/questions/108113/find-edge-between-two-boxes
    const dx = point.x - cx;
    const dy = point.y - cy;
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

    return { x: cx + sx, y: cy + sy };
  };

  return group;
};

export const drawUsecase = (
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  bbox: { width: number; height: number },
  node: any
): d3.Selection<SVGGElement, unknown, null, undefined> => {
  // デフォルトのラベル要素を削除
  parent.selectAll("g.label").remove();

  const radius = 50;
  const rx = radius * 1.6;
  const ry = radius * 1.1;

  const strokeColor =
    detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

  const group = parent.append<SVGGElement>("g");

  group
    .append<SVGEllipseElement>("ellipse")
    .attr("rx", rx)
    .attr("ry", ry)
    .attr("fill", "none")
    .attr("stroke", strokeColor)
    .attr("stroke-width", BASE_STROKE_WIDTH);

  group
    .append<SVGTextElement>("text")
    .attr("y", 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("fill", strokeColor)
    .text(node.label);

  node.intersect = (point: { x: number; y: number }) => {
    return Intersector.ellipse(node, rx, ry, point);
  };
  return group;
};

/**
 * edgeがあるが、ここで線を引いても（svg要素としてはいるのに）画面上に出てこない
 * @param parent
 * @param id
 * @param edge
 * @param type
 */
export const drawArrow = (
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  id: string,
  edge: any,
  type: "arrowhead"
): void => {
  console.log("****** よばれてるよ ******", edge);

  const marker = parent
    .append<SVGMarkerElement>("marker")
    .attr("id", id)
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 9)
    .attr("refY", 5)
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", 8)
    .attr("markerHeight", 6)
    .attr("orient", "auto");

  const path = marker
    .append<SVGPathElement>("path")
    .attr("d", "M 0 0 L 20 10 L 0 20 z")
    .style("stroke-width", 1)
    .style("stroke-dasharray", "1,0")
    .style("fill", "#fff")
    .style("stroke", "#fff");

  if (edge["arrowheadStyle"]) {
    path.attr("style", edge["arrowheadStyle"]);
  } else {
    path.attr("style", null);
  }
};
