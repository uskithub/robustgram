import * as d3 from "d3";
import { intersect } from "dagre-d3-es";

export type Control = {
  id: string;
  x: number;
  y: number;
  label: string;
};
/**
 * _render.shapes().control = drawControl;
 * @param parent
 * @param bbox
 * @param node
 * @returns
 */
export const drawControl = (
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  bbox: { width: number; height: number },
  node: any
): d3.Selection<SVGGElement, unknown, null, undefined> => {
  const radius = 40;

  const group = parent
    .append<SVGGElement>("g")
    .attr("transform", `translate(${bbox.width / 2},${bbox.height / 2})`);

  group
    .append<SVGCircleElement>("circle")
    .attr("r", radius)
    .attr("fill", "lightblue")
    .attr("stroke", "black")
    .attr("stroke-width", 2);

  // 矢羽を描画
  const arrowSize = 10;
  const points = [
    { x: radius, y: -arrowSize },
    { x: radius + arrowSize, y: 0 },
    { x: radius, y: arrowSize },
  ];

  group
    .append<SVGPolygonElement>("polygon")
    .attr("points", points.map((d) => `${d.x},${d.y}`).join(" "))
    .attr("fill", "red")
    .attr("stroke", "black")
    .attr("stroke-width", 2);

  group
    .append<SVGTextElement>("text")
    .attr("y", 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("fill", "black")
    .text(node.label);

  node.intersect = function (point: any) {
    // const x = point.x - node.x;
    // const y = point.y - node.y;
    // const dist = Math.sqrt(x * x + y * y);
    // if (dist < radius) {
    //   return {
    //     x: node.x + (x * radius) / dist,
    //     y: node.y + (y * radius) / dist,
    //   };
    // }
    // return point;
    return intersect.circle.intersectCircle(node, radius, point);
  };

  return group;
};
