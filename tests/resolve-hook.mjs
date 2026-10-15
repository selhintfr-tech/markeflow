import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if ((err.code === "ERR_MODULE_NOT_FOUND" || err.code === "ERR_UNSUPPORTED_DIR_IMPORT") && 
        (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/"))) {
      const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
      const targetPath = path.resolve(parentDir, specifier);
      const extensions = [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"];
      for (const ext of extensions) {
        const candidate = targetPath + ext;
        if (existsSync(candidate)) {
          return {
            url: pathToFileURL(candidate).href,
            shortCircuit: true
          };
        }
      }
    }
    throw err;
  }
}
