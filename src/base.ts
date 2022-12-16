import { XMLSerializer } from "xmldom";
import core from "./core";

export abstract class Base {
  protected constructor(private nocolor: boolean) {}

  protected serialize(element: Node): string {
    const serializer = new XMLSerializer();
    return this.fixTags(serializer.serializeToString(element));
  }

  protected fixTags(xml: string): string {
    return xml.replace(/(<stringProp\s[^>]+)\/>/g, "$1></stringProp>");
  }

  protected logYellow(text: string) {
    if (this.nocolor) {
      return text;
    }
    return `\x1b[33m${text}\x1b[0m`;
  }

  protected logGreen(text: string) {
    if (this.nocolor) {
      return text;
    }
    return `\x1b[32m${text}\x1b[0m`;
  }

  protected showMessage(text: string) {
    if (this.nocolor) {
      console.log(text);
    }
    core.showMessage(text);
  }
  protected showError(error: string) {
    if (this.nocolor) {
      console.log(error);
      process.exit(1);
    }
    core.showError(error);
  }
}
