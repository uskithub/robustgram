import type * as d3 from "d3";
import { select } from "d3";
import { compile, serialize, stringify } from "stylis";
import { version } from "../package.json";
import { Diagram, registerDiagram } from "./diagram";
import { cleanup } from "./cleanup";
import { RobustiveDiagram } from "./robustive";
import { StateDiagram } from "./state/state";

let cnt = 0;
export const generateId = () => {
  cnt++;
  return "id-" + Math.random().toString(36).substr(2, 12) + "-" + cnt;
};

interface DetailedError {
  str: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hash: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: any;
  message?: string;
}

interface RenderResult {
  /**
   * The svg code for the rendered graph.
   */
  svg: string;
  /**
   * The diagram type, e.g. 'flowchart', 'sequence', etc.
   */
  diagramType: string;
  /**
   * Bind function to be called after the svg has been inserted into the DOM.
   * This is necessary for adding event listeners to the elements in the svg.
   * ```js
   * const { svg, bindFunctions } = mermaidAPI.render('id1', 'graph TD;A-->B');
   * div.innerHTML = svg;
   * bindFunctions?.(div); // To call bindFunctions only if it's present.
   * ```
   */
  bindFunctions?: (element: Element) => void;
}

type D3Element = any;
const XMLNS_SVG_STD = "http://www.w3.org/2000/svg";
const XMLNS_XLINK_STD = "http://www.w3.org/1999/xlink";
const XMLNS_XHTML_STD = "http://www.w3.org/1999/xhtml";

const appendDivSvgG = (
  parentRoot: D3Element,
  id: string,
  enclosingDivId: string
): D3Element => {
  const enclosingDiv = parentRoot.append("div");
  enclosingDiv.attr("id", enclosingDivId);
  enclosingDiv.attr(
    "style",
    `font-family: "trebuchet ms", verdana, arial, sans-serif;`
  );

  const svgNode = enclosingDiv
    .append("svg")
    .attr("id", id)
    .attr("width", "100%")
    .attr("xmlns", XMLNS_SVG_STD)
    .attr("xmlns:xlink", XMLNS_XLINK_STD);

  svgNode.append("g");
  return parentRoot;
};

type DiagramStylesProvider = (options?: any) => string;

const themes: Record<string, DiagramStylesProvider> = {};

const getStyles = (
  type: string,
  userStyles: string,
  options: {
    fontFamily: string;
    fontSize: string;
    textColor: string;
    errorBkgColor: string;
    errorTextColor: string;
    lineColor: string;
  }
) => {
  let diagramStyles = "";
  if (type in themes && themes[type as keyof typeof themes]) {
    diagramStyles = themes[type as keyof typeof themes](options);
  } else {
    console.warn(`No theme found for ${type}`);
  }
  return ` & {
    font-family: ${options.fontFamily};
    font-size: ${options.fontSize};
    fill: ${options.textColor}
  }

  /* Classes common for multiple diagrams */

  & .error-icon {
    fill: ${options.errorBkgColor};
  }
  & .error-text {
    fill: ${options.errorTextColor};
    stroke: ${options.errorTextColor};
  }

  & .edge-thickness-normal {
    stroke-width: 2px;
  }
  & .edge-thickness-thick {
    stroke-width: 3.5px
  }
  & .edge-pattern-solid {
    stroke-dasharray: 0;
  }

  & .edge-pattern-dashed{
    stroke-dasharray: 3;
  }
  .edge-pattern-dotted {
    stroke-dasharray: 2;
  }

  & .marker {
    fill: ${options.lineColor};
    stroke: ${options.lineColor};
  }
  & .marker.cross {
    stroke: ${options.lineColor};
  }

  & svg {
    font-family: ${options.fontFamily};
    font-size: ${options.fontSize};
  }

  ${diagramStyles}

  ${userStyles}
`;
};

const createUserStyles = (graphType: string, svgId: string): string => {
  const userCSSstyles = "";
  const allStyles = getStyles(graphType, userCSSstyles, {
    fontFamily: '"trebuchet ms", verdana, arial, sans-serif',
    fontSize: "16px",
    textColor: "#333",
    errorBkgColor: "#552222",
    errorTextColor: "#552222",
    lineColor: "#333333",
  });

  // Now turn all of the styles into a (compiled) string that starts with the id
  // use the stylis library to compile the css, turn the results into a valid CSS string (serialize(...., stringify))
  // @see https://github.com/thysultan/stylis
  return serialize(compile(`${svgId}{${allStyles}}`), stringify);
};

type SVG = d3.Selection<SVGSVGElement, unknown, Element | null, unknown>;
type Group = d3.Selection<SVGGElement, unknown, Element | null, unknown>;
type HTML = d3.Selection<HTMLIFrameElement, unknown, Element | null, unknown>;

const selectSvgElement = (id: string): SVG => {
  // handle root and document for when rendering in sandbox mode
  let root: HTML = select("body");
  const svg: SVG = root.select(`#${id}`);
  return svg;
};

const calculateSvgSizeAttrs = (
  height: number | string,
  width: number | string,
  useMaxWidth: boolean
) => {
  let attrs = new Map();
  if (useMaxWidth) {
    attrs.set("width", "100%");
    attrs.set("style", `max-width: ${width}px;`);
  } else {
    attrs.set("height", height);
    attrs.set("width", width);
  }
  return attrs;
};

const d3Attrs = (
  d3Elem: d3.Selection<SVGSVGElement, unknown, Element | null, unknown>,
  attrs: Map<string, any>
) => {
  for (let attr of attrs) {
    d3Elem.attr(attr[0], attr[1]);
  }
};

export const configureSvgSize = function (
  svgElem: d3.Selection<SVGSVGElement, unknown, Element | null, unknown>,
  height: number | string,
  width: number | string,
  useMaxWidth: boolean
) {
  const attrs = calculateSvgSizeAttrs(height, width, useMaxWidth);
  d3Attrs(svgElem, attrs);
};

const errorDraw = (_text: string, id: string, version: string) => {
  console.debug("rendering svg for syntax error\n");
  const svg: SVG = selectSvgElement(id);
  const g: Group = svg.append("g");

  svg.attr("viewBox", "0 0 2412 512");
  configureSvgSize(svg, 100, 512, true);

  g.append("path")
    .attr("class", "error-icon")
    .attr(
      "d",
      "m411.313,123.313c6.25-6.25 6.25-16.375 0-22.625s-16.375-6.25-22.625,0l-32,32-9.375,9.375-20.688-20.688c-12.484-12.5-32.766-12.5-45.25,0l-16,16c-1.261,1.261-2.304,2.648-3.31,4.051-21.739-8.561-45.324-13.426-70.065-13.426-105.867,0-192,86.133-192,192s86.133,192 192,192 192-86.133 192-192c0-24.741-4.864-48.327-13.426-70.065 1.402-1.007 2.79-2.049 4.051-3.31l16-16c12.5-12.492 12.5-32.758 0-45.25l-20.688-20.688 9.375-9.375 32.001-31.999zm-219.313,100.687c-52.938,0-96,43.063-96,96 0,8.836-7.164,16-16,16s-16-7.164-16-16c0-70.578 57.422-128 128-128 8.836,0 16,7.164 16,16s-7.164,16-16,16z"
    );

  g.append("path")
    .attr("class", "error-icon")
    .attr(
      "d",
      "m459.02,148.98c-6.25-6.25-16.375-6.25-22.625,0s-6.25,16.375 0,22.625l16,16c3.125,3.125 7.219,4.688 11.313,4.688 4.094,0 8.188-1.563 11.313-4.688 6.25-6.25 6.25-16.375 0-22.625l-16.001-16z"
    );

  g.append("path")
    .attr("class", "error-icon")
    .attr(
      "d",
      "m340.395,75.605c3.125,3.125 7.219,4.688 11.313,4.688 4.094,0 8.188-1.563 11.313-4.688 6.25-6.25 6.25-16.375 0-22.625l-16-16c-6.25-6.25-16.375-6.25-22.625,0s-6.25,16.375 0,22.625l15.999,16z"
    );

  g.append("path")
    .attr("class", "error-icon")
    .attr(
      "d",
      "m400,64c8.844,0 16-7.164 16-16v-32c0-8.836-7.156-16-16-16-8.844,0-16,7.164-16,16v32c0,8.836 7.156,16 16,16z"
    );

  g.append("path")
    .attr("class", "error-icon")
    .attr(
      "d",
      "m496,96.586h-32c-8.844,0-16,7.164-16,16 0,8.836 7.156,16 16,16h32c8.844,0 16-7.164 16-16 0-8.836-7.156-16-16-16z"
    );

  g.append("path")
    .attr("class", "error-icon")
    .attr(
      "d",
      "m436.98,75.605c3.125,3.125 7.219,4.688 11.313,4.688 4.094,0 8.188-1.563 11.313-4.688l32-32c6.25-6.25 6.25-16.375 0-22.625s-16.375-6.25-22.625,0l-32,32c-6.251,6.25-6.251,16.375-0.001,22.625z"
    );

  g.append("text") // text label for the x axis
    .attr("class", "error-text")
    .attr("x", 1440)
    .attr("y", 250)
    .attr("font-size", "150px")
    .style("text-anchor", "middle")
    .text("Syntax error in text");
  g.append("text") // text label for the x axis
    .attr("class", "error-text")
    .attr("x", 1250)
    .attr("y", 400)
    .attr("font-size", "100px")
    .style("text-anchor", "middle")
    .text(`mermaid version ${version}`);
};

const SVG_ROLE = "graphics-document document";

const setA11yDiagramInfo = (svg: D3Element, diagramType: string) => {
  svg.attr("role", SVG_ROLE);
  if (diagramType !== "") {
    svg.attr("aria-roledescription", diagramType);
  }
};

const addSVGa11yTitleDescription = (
  svg: D3Element,
  a11yTitle: string | undefined,
  a11yDesc: string | undefined,
  baseId: string
): void => {
  if (svg.insert === undefined) {
    return;
  }

  if (a11yDesc) {
    const descId = `chart-desc-${baseId}`;
    svg.attr("aria-describedby", descId);
    svg.insert("desc", ":first-child").attr("id", descId).text(a11yDesc);
  }
  if (a11yTitle) {
    const titleId = `chart-title-${baseId}`;
    svg.attr("aria-labelledby", titleId);
    svg.insert("title", ":first-child").attr("id", titleId).text(a11yTitle);
  }
};

const addA11yInfo = (
  diagramType: string,
  svgNode: D3Element,
  a11yTitle?: string,
  a11yDescr?: string
): void => {
  setA11yDiagramInfo(svgNode, diagramType);
  addSVGa11yTitleDescription(svgNode, a11yTitle, a11yDescr, svgNode.attr("id"));
};

const decodeEntities = function (text: string): string {
  return text.replace(/ﬂ°°/g, "&#").replace(/ﬂ°/g, "&").replace(/¶ß/g, ";");
};

const cleanUpSvgCode = (svgCode: string): string => {
  // Replace marker-end urls with just the # anchor (remove the preceding part of the URL)

  svgCode = svgCode.replace(
    /marker-end="url\([\d+./:=?A-Za-z-]*?#/g,
    'marker-end="url(#'
  );

  svgCode = decodeEntities(svgCode);

  // replace old br tags with newer style
  svgCode = svgCode.replace(/<br>/g, "<br/>");

  return svgCode;
};

const render = async (
  id: string,
  text: string,
  svgContainingElement: Element
): Promise<RenderResult> => {
  registerDiagram("robustive", new RobustiveDiagram());
  registerDiagram("stateDiagram", new StateDiagram());

  const idSelector = "#" + id;
  const enclosingDivID = "d" + id;
  const enclosingDivID_selector = "#" + enclosingDivID;

  const removeTempElements = () => {
    // -------------------------------------------------------------------------------
    // Remove the temporary HTML element if appropriate
    const tmpElementSelector = enclosingDivID_selector;
    const node = select(tmpElementSelector).node();
    if (node && "remove" in node) {
      node.remove();
    }
  };

  // -------------------------------------------------------------------------------
  // Define the root d3 node
  // In regular execution the svgContainingElement will be the element with a mermaid class

  svgContainingElement.innerHTML = "";

  let root = select<Element, unknown>(svgContainingElement);

  appendDivSvgG(root, id, enclosingDivID);

  // -------------------------------------------------------------------------------
  // Create the diagram

  // Important that we do not create the diagram until after the directives have been included
  let diag: Diagram;
  let parseEncounteredException;

  try {
    diag = await Diagram.fromText(text, { title: "dummy" });
  } catch (error) {
    console.error("Error parsing text", error);
    parseEncounteredException = error;
    throw error;
  }

  // Get the temporary div element containing the svg
  const element = root.select<HTMLDivElement>(enclosingDivID_selector).node()!;
  const diagramType = diag.type;

  // -------------------------------------------------------------------------------
  // Create and insert the styles (user styles, theme styles, config styles)

  // Insert an element into svg. This is where we put the styles
  const svg = element.firstChild!;
  const firstChild = svg.firstChild!;

  const style = document.createElement("style");
  style.innerHTML = createUserStyles(diagramType, idSelector);
  svg.insertBefore(style, firstChild);

  // -------------------------------------------------------------------------------
  // Draw the diagram with the renderer
  try {
    await diag.renderer.draw(text, id, version);
  } catch (e) {
    errorDraw(text, id, version);
    throw e;
  }

  // This is the d3 node for the svg element
  const svgNode = root.select(`${enclosingDivID_selector} svg`);
  const a11yTitle = diag.db.getAccTitle?.();
  const a11yDescr = diag.db.getAccDescription?.();
  addA11yInfo(diagramType, svgNode, a11yTitle, a11yDescr);
  // -------------------------------------------------------------------------------
  // Clean up SVG code
  root
    .select(`[id="${id}"]`)
    .selectAll("foreignobject > *")
    .attr("xmlns", XMLNS_XHTML_STD);

  // Fix for when the base tag is used
  const svgElem = root.select<HTMLDivElement>(enclosingDivID_selector).node()!;

  let svgCode: string = svgElem.innerHTML;

  svgCode = cleanUpSvgCode(svgCode);

  if (parseEncounteredException) {
    throw parseEncounteredException;
  }

  removeTempElements();

  return {
    diagramType,
    svg: svgCode,
    bindFunctions: diag.db.bindFunctions,
  };
};

class InitIDGenerator {
  private count = 0;
  public next: () => number;
  constructor(deterministic = false, seed?: string) {
    // TODO: Seed is only used for length?
    // v11: Use the actual value of seed string to generate an initial value for count.
    this.count = seed ? seed.length : 0;
    this.next = deterministic ? () => this.count++ : () => Date.now();
  }
}

export const run = async (querySelector: string = ".mermaid") => {
  const nodesToProcess: ArrayLike<HTMLElement> =
    document.querySelectorAll(querySelector);

  console.log(`Found ${nodesToProcess.length} diagrams`);

  // generate the id of the diagram
  const idGenerator = new InitIDGenerator();
  const errors: DetailedError[] = [];

  // element is the current div with mermaid class
  // eslint-disable-next-line unicorn/prefer-spread
  for (const element of Array.from(nodesToProcess)) {
    console.info("Rendering diagram: " + element.id);
    /*! Check if previously processed */
    if (element.getAttribute("data-processed")) {
      continue;
    }
    element.setAttribute("data-processed", "true");

    const id = `mermaid-${idGenerator.next()}`;

    // Fetch the graph definition including tags
    const html = element.innerHTML;
    const text = cleanup(html);

    try {
      const { svg, bindFunctions } = await render(id, text, element);
      element.innerHTML = svg;

      if (bindFunctions) {
        bindFunctions(element);
      }
    } catch (error) {
      // console.error(error, errors);
    }
  }
  if (errors.length > 0) {
    // TODO: We should be throwing an error object.
    throw errors[0];
  }
};
