import commandLineArgs, { OptionDefinition } from "command-line-args";
import core from "./core";
import { Joiner } from "./joiner";
import { Splitter } from "./splitter";

const optionDefinitions: OptionDefinition[] = [
  { name: "file", alias: "f", type: String },
  { name: "split", alias: "s", type: Boolean },
  { name: "join", alias: "j", type: Boolean },
];
const options = commandLineArgs(optionDefinitions);

// function getPath(node: Node) {
//   let path = "";
//   if (node.parentNode != null) {
//     path += getPath(node.parentNode) + " > ";
//   }
//   path += node.nodeName;
//   return path;
// }

// function hasAncestor(element: Element, tagName: string): boolean {
//   element = element.parentElement;
//   if (!element) {
//     return false;
//   }
//   if (element.nodeName === tagName) {
//     return true;
//   }
//   return hasAncestor(element, tagName);
// }

// function print(something: any) {
//   if (something) {
//     if (isElement(something)) {
//       return something.tagName;
//     }
//     return (something as Object).constructor.name;
//   }
//   return something;
// }

if (options.split && options.file) {
  const splitter = new Splitter(options.file);
  splitter.splitToParts();
} else if (options.join && options.file) {
  const joiner = new Joiner(options.file);
  joiner.joinFromParts();
} else {
  core.showError("For split: node index.js -f someFile.jmx -s\nFor join: node index.js -f someFile.jmx -j");
}
