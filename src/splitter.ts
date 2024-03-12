import fs from "fs";
import path from "path";
import { DOMParser } from "xmldom";
import xpath from "xpath";
import { Base } from "./base";
import core from "./core";
const md5 = require("md5");

export class Splitter extends Base {
  dom: Document;

  public constructor(private filePath: string, nocolor: boolean) {
    super(nocolor);
  }

  public splitToParts() {
    const dom = new DOMParser().parseFromString(core.readTextFile(this.filePath), "application/xml");
    const controllers = this.getControllers(dom);
    this.checkDuplicites(controllers);
    this.exportToParts(controllers, dom);
  }

  private getControllers(dom: Document): Element[] {
    const nodes = xpath.select("//kg.apc.jmeter.control.ParameterizedController", dom);
    let elements: Element[] = nodes.filter((some) => {
      if (!(some instanceof Object)) {
        return false;
      }
      if (!this.isElement(some)) {
        return false;
      }
      const element = some as Element;
      const next = this.nextElement(element);
      if (this.isHashTree(next)) {
        const childElements = this.noHashTree(this.getChildElements(next));
        if (childElements.length === 1 && childElements[0].tagName === "ModuleController") {
          // console.log("Removed " + this.getTestName(element);
          return false;
        }
      }
      return true;
    }) as any;

    // console.log(elements.map((e) => this.getTestName(e)));

    // Remove parent controllers
    var exclude = new Set<Element>();
    for (const element of elements) {
      const testCaseController = this.getClosestTestCaseController(element);
      if (testCaseController) {
        exclude.add(element);
      } else {
        // Obsolete variant if test case controller does not exist in given path
        const controller = this.getClosestController(element);
        if (controller) {
          exclude.add(controller);
        }
      }
    }
    const validControllers = elements.filter((e) => !exclude.has(e));
    // console.log(validControllers.map((e) => this.getTestName(e)));
    return validControllers;
  }

  private checkDuplicites(controllers: Element[]) {
    const controllersCountByIdText: { [testName: string]: number } = {};
    for (const element of controllers) {
      const idText = this.getTextForId(this.getTestName(element));
      if (!controllersCountByIdText[idText]) {
        controllersCountByIdText[idText] = 0;
      }
      controllersCountByIdText[idText]++;
    }

    let found = false;
    Object.entries(controllersCountByIdText).forEach(([testName, count]) => {
      if (count > 1) {
        if (!found) {
          this.showMessage("Duplicate names of controllers found:");
        }
        found = true;
        console.log(`  ${count}x ${testName}`);
      }
    });
    if (found) {
      this.showError("ERROR: Controller name must be unique.");
    }
  }

  private exportToParts(controllers: Element[], dom: Document) {
    // Replace nodes
    const dirPath = this.getPartsFolderFromJmxFile(this.filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, {
        recursive: true,
      });
    }
    fs.readdirSync(dirPath)
      .filter((f) => f.endsWith(".xml"))
      .forEach((f) => fs.unlinkSync(path.join(dirPath, f)));
    for (const element of controllers) {
      const next = this.nextElement(element);
      if (this.isHashTree(next)) {
        const nodesToRemove = this.getSiblinksByRange(element, next);
        const testname = this.getTestName(element);
        const idText = this.getTextForId(testname);
        const partFileName = md5(idText) + ".xml";
        console.log(`  ${this.isTestCaseController(element) ? this.logGreen("✔ " + idText) : this.logRed("❌ " + idText)} to ${this.logYellow(partFileName)}`);
        const partFilePath = path.join(dirPath, partFileName);
        const nodesAsString = nodesToRemove.map((n) => this.serialize(n)).join("");
        core.writeTextFile(partFilePath, `<?xml version="1.0" encoding="UTF-8"?>\n<root>${nodesAsString}</root>`);
        let includeNode = dom.createElement("jmeter2git.controller");
        includeNode.setAttribute("testname", idText);
        includeNode.setAttribute("filename", partFileName);
        next.parentNode.replaceChild(includeNode, element);
        for (const node of nodesToRemove.slice(1)) {
          element.parentNode.removeChild(node);
        }
      }
    }
    console.log(`${this.logGreen("Workspace")} to ${this.logYellow("_workspace.xml")}`);
    core.writeTextFile(path.join(dirPath, "_workspace.xml"), this.serialize(dom));
  }

  private getSiblinksByRange(fromNode: Node, toNode: Node): Node[] {
    const nodes: Node[] = [];
    nodes.push(fromNode);
    let node = fromNode;
    let counter = 100;
    do {
      node = node.nextSibling;
      nodes.push(node);
      counter--;
    } while (node !== toNode && counter > 0);
    if (counter === 0) {
      throw new Error("Sibling is to far");
    }
    return nodes;
  }

  private isElement(node: any): node is Element {
    return node instanceof Object && node.nodeType === 1;
  }

  private nextElement(element: any): Element | null {
    if (!element.nextSibling) {
      return null;
    }
    if (this.isElement(element.nextSibling)) {
      return element.nextSibling;
    }
    return this.nextElement(element.nextSibling);
  }

  private isHashTree(element: Element): boolean {
    return element.tagName === "hashTree";
  }

  private isController(element: Element): boolean {
    return element.tagName === "kg.apc.jmeter.control.ParameterizedController";
  }

  private noHashTree(elements: Element[]): Element[] {
    return elements.filter((e) => !this.isHashTree(e));
  }

  private getChildElements(element: Element): Element[] {
    const elements: Element[] = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes.item(i);
      if (this.isElement(child)) {
        elements.push(child);
      }
    }
    return elements;
  }

  private getTestName(element: Element): string {
    return element.getAttribute("testname");
  }

  private getTextForId(testname: string): string {
    // ## TestName | comment
    // Also replaces - T1234
    return (testname.match(/^(##\s+)?([^|]+)(\|.*)?$/)?.[2] ?? "").replace(/- T\d+/g, "").trim();
  }

  private isTestCaseController(controller: Element): boolean {
    const testName = this.getTestName(controller) ?? "";
    return !!testName.match(/^## /);
  }

  private getClosestTestCaseController(element: Node): Element | null {
    const controller = this.getClosestController(element);
    if (controller == null) {
      return null;
    }
    return this.isTestCaseController(controller) ? controller : this.getClosestTestCaseController(controller);
  }

  private getClosestController(element: Node): Element | null {
    if (!element.parentNode) {
      return null;
    }
    const prevEl = this.prevElement(element.parentNode);
    if (prevEl && this.isController(prevEl)) {
      return prevEl;
    }
    return this.getClosestController(element.parentNode);
  }

  private prevElement(element: any): Element | null {
    if (!element.previousSibling) {
      return null;
    }
    if (this.isElement(element.previousSibling)) {
      return element.previousSibling;
    }
    return this.prevElement(element.previousSibling);
  }
}
