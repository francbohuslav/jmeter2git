import path from "path";
import { DOMParser } from "xmldom";
import xpath from "xpath";
import { Base } from "./base";
import core from "./core";

export class Joiner extends Base {
  public constructor(private filePath: string) {
    super();
  }

  public joinFromParts() {
    const dom = this.loadWorkspace();
    this.replaceControllers(dom);
    core.writeTextFile(this.filePath + ".dest.xml", this.serialize(dom));
  }

  private loadWorkspace() {
    const dirPath = this.filePath + "-parts";
    const workspacePath = path.join(dirPath, "_workspace.xml");
    return new DOMParser().parseFromString(core.readTextFile(workspacePath), "application/xml");
  }

  private replaceControllers(dom: Document) {
    const controllers: Element[] = [...xpath.select("//jmeter2git.controller", dom)] as any;
    for (const controller of controllers) {
      this.replaceController(controller, dom);
    }
  }

  private replaceController(controller: Element, dom: Document) {
    console.log(controller.getAttribute("filename"));
    const dirPath = this.filePath + "-parts";
    const partPath = path.join(dirPath, controller.getAttribute("filename"));
    const partDom = new DOMParser().parseFromString(core.readTextFile(partPath), "application/xml");
    const parts = (xpath.select1("/root", partDom) as Node).childNodes;
    while (parts.length > 0) {
      controller.parentNode.insertBefore(parts.item(0), controller);
    }
    controller.parentNode.removeChild(controller);
  }
}
