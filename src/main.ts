import "./style.css";

// @ts-ignore: JISON doesn't support types
import { DiagramDefinition, registerDiagram } from "./diagram";
import { run } from "./render";
import { RobustiveDiagram } from "./robustive.js";

export const initialize = () => {
  registerDiagram("robustive", new RobustiveDiagram());
};

if (typeof document !== "undefined") {
  window.addEventListener(
    "load",
    () => {
      return run().catch((err) =>
        console.error("Mermaid failed to initialize", err)
      );
    },
    false
  );
}
