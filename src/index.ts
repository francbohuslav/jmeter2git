import commandLineArgs from "command-line-args";
import core from "./core";

const optionDefinitions = [{ name: "jmxFile", alias: "j", type: String }];
const options = commandLineArgs(optionDefinitions);

(async () => {
  console.log(options);
  console.log(core.readTextFile(options.jmxFile));
})();
