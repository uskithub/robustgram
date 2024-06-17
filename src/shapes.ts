import * as d3 from "d3";
import { intersect } from "dagre-d3-es";

export const drawControl = (
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  bbox: { width: number; height: number },
  node: any
): d3.Selection<SVGGElement, unknown, null, undefined> => {
  const radius = 50;
  const arrow_size = radius / 3;

  const strokeColor =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "white"
      : "black";

  const group = parent
    .append<SVGGElement>("g")
    .attr("transform", `translate(${bbox.width / 2},${bbox.height / 2})`);

  group
    .append<SVGCircleElement>("circle")
    .attr("r", radius)
    .attr("fill", "none")
    .attr("stroke", strokeColor)
    .attr("stroke-width", 2);

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
    .attr("stroke-width", 2);

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
