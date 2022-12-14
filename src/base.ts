import { XMLSerializer } from "xmldom";

export abstract class Base {
  protected serialize(element: Node): string {
    const serializer = new XMLSerializer();
    return this.fixTags(serializer.serializeToString(element));
  }

  protected fixTags(xml: string): string {
    return xml.replace(/(<stringProp\s[^>]+)\/>/g, "$1></stringProp>");
  }
}
