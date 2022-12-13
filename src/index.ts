import commandLineArgs from "command-line-args";
import { DOMParser, XMLSerializer } from "xmldom";
import xpath from "xpath";
import core from "./core";

const optionDefinitions = [{ name: "jmxFile", alias: "j", type: String }];
const options = commandLineArgs(optionDefinitions);

function getPath(node: Node) {
  let path = "";
  if (node.parentNode != null) {
    path += getPath(node.parentNode) + " > ";
  }
  path += node.nodeName;
  return path;
}

function isElement(node: any): node is Element {
  return node instanceof Object && node.nodeType === 1;
}

function hasAncestor(element: Element, tagName: string): boolean {
  element = element.parentElement;
  if (!element) {
    return false;
  }
  if (element.nodeName === tagName) {
    return true;
  }
  return hasAncestor(element, tagName);
}

function print(something: any) {
  if (something) {
    if (isElement(something)) {
      return something.tagName;
    }
    return (something as Object).constructor.name;
  }
  return something;
}

function prevElement(element: any): Element | null {
  if (!element.previousSibling) {
    return null;
  }
  if (isElement(element.previousSibling)) {
    return element.previousSibling;
  }
  return prevElement(element.previousSibling);
}

function nextElement(element: any): Element | null {
  if (!element.nextSibling) {
    return null;
  }
  if (isElement(element.nextSibling)) {
    return element.nextSibling;
  }
  return nextElement(element.nextSibling);
}

function isHashTree(element: Element): boolean {
  return element.tagName === "hashTree";
}

function isController(element: Element): boolean {
  return element.tagName === "kg.apc.jmeter.control.ParameterizedController";
}

function noHashTree(elements: Element[]): Element[] {
  return elements.filter((e) => !isHashTree(e));
}

function getChildElements(element: Element): Element[] {
  const elements: Element[] = [];
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes.item(i);
    if (isElement(child)) {
      elements.push(child);
    }
  }
  return elements;
}

function getClosestController(element: Node): Element | null {
  if (!element.parentNode) {
    return null;
  }
  const prevEl = prevElement(element.parentNode);
  if (prevEl && isController(prevEl)) {
    return prevEl;
  }
  return getClosestController(element.parentNode);
}

(async () => {
  const dom = new DOMParser().parseFromString(core.readTextFile(options.jmxFile));

  const nodes = xpath.select("//kg.apc.jmeter.control.ParameterizedController", dom);
  let elements: Element[] = nodes.filter((some) => {
    if (!(some instanceof Object)) {
      return false;
    }
    if (!("nodeType" in some)) {
      return false;
    }
    const element = some as Element;
    if (hasAncestor(element, "kg.apc.jmeter.control.ParameterizedController")) {
      return false;
    }
    const next = nextElement(element);
    if (isHashTree(next)) {
      const childElements = noHashTree(getChildElements(next));
      if (childElements.length === 1 && childElements[0].tagName === "ModuleController") {
        return false;
      }
    }
    return true;
  }) as any;
  var exclude = new Set<Element>();
  for (const element of elements) {
    const controller = getClosestController(element);
    if (controller) {
      exclude.add(controller);
    }
    // if (element.childNodes) {
    //   for (let i = 0; i < element.childNodes.length; i++) {
    //     const child = element.node;
    //     child.remove();
    //   }
    // }
  }
  elements = elements.filter((e) => !exclude.has(e));
  for (const element of elements) {
    console.log(getPath(element) + " " + element.getAttribute("testname"));
    element.textContent = "";
    const next = nextElement(element);
    if (isHashTree(next)) {
      next.textContent = "";
    }
  }
  const serializer = new XMLSerializer();

  core.writeTextFile(options.jmxFile + ".desc.xml", serializer.serializeToString(dom));

  // nodes.forEach((n) =>
  //   results.push({
  //     info: {
  //       label: n.getAttribute("lb"),
  //       asserts: xpath
  //         .select("./assertionResult", n)
  //         .filter((fn) => xpath.select1("./failure", fn).textContent == "true")
  //         .map((fn) => xpath.select1("./failureMessage", fn).textContent.replace(/[\r\n]+/g, " ")),
  //       responseData: xpath.select1("./responseData", n).textContent,
  //     },
  //     success: n.getAttribute("s") == "true",
  //   })
})();
