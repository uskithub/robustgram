import * as d3 from "d3";
import { intersect } from "dagre-d3-es";

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

export const drawActor = (
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  bbox: { width: number; height: number },
  node: any
): d3.Selection<SVGGElement, unknown, null, undefined> => {
  // デフォルトのラベル要素を削除
  parent.selectAll("g.label").remove();

  const radius = 16;

  const strokeColor =
    detectDisplayMode() === DisplayMode.Dark ? "white" : "black";

  const group = parent.append<SVGGElement>("g");
  // .attr("transform", `translate(${bbox.width / 2},${bbox.height / 2})`);

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
        [-radius * 1.6, radius * 1.6],
        [0, radius * 1.8],
        [0, radius],
        [0, radius * 3.2],
        [-radius * 1.4, radius * 5],
        [0, radius * 3.2],
        [radius * 1.4, radius * 5],
        [0, radius * 3.2],
        [0, radius * 1.8],
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
    const cx = node.x; //+ bbox.width / 2;
    const cy = node.y; //+ bbox.height / 2;

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
    return intersect.circle.intersectCircle(node, radius, point);
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
    return intersect.circle.intersectCircle(node, radius, point);
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
        [-((radius / 10) * 13), (radius / 10) * 8],
        [-((radius / 10) * 13), (-radius / 10) * 8],
        [-((radius / 10) * 13), 0],
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
    const cx = node.x; // + bbox.width / 2;
    const cy = node.y; // + bbox.height / 2;

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
    .text(node.label + "p");

  node.intersect = (point: { x: number; y: number }) => {
    return intersect.ellipse.intersectEllipse(node, rx, ry, point);
  };
  return group;
};
