import commandLineArgs, { OptionDefinition } from "command-line-args";
import glob from "glob";
import { promisify } from "util";
import core from "./core";
import { Joiner } from "./joiner";
import { Splitter } from "./splitter";

const globAsync = promisify(glob);

const optionDefinitions: OptionDefinition[] = [
  { name: "file", alias: "f", type: String, multiple: true },
  { name: "split", alias: "s", type: Boolean },
  { name: "join", alias: "j", type: Boolean },
  { name: "nocolors", alias: "n", type: Boolean },
];
const options = commandLineArgs(optionDefinitions);

function showSyntaxe() {
  core.showError("For split: node index.js -f someFile.jmx -s\nFor join: node index.js -f someFile.jmx -j");
}

(async () => {
  let files: string[] = [];
  if (options.file) {
    for (let file of options.file) {
      file = file.replace(/\\/g, "/");
      files = files.concat(await globAsync(file));
    }
  }

  if (files.length > 0) {
    for (const file of files) {
      if (options.nocolors) {
        console.log(file);
      } else {
        core.showMessage(file);
      }
      if (options.split) {
        const splitter = new Splitter(file, options.nocolors);
        splitter.splitToParts();
      } else if (options.join) {
        const joiner = new Joiner(file, options.nocolors);
        joiner.joinFromParts();
      } else showSyntaxe();
    }
  } else {
    showSyntaxe();
  }
})();
