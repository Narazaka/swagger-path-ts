/// <reference types="node" />

import * as fs from "fs";
// tslint:disable-next-line no-require-imports no-var-requires
const dtsgen = require("dtsgenerator").default; // dtsgeneratorに型がないので

import { addIdForDefinitions, refPathToId } from "./definitionToIdRef";
import { genMethod } from "./genMethod";
import { genNamespacedMethods } from "./genNamespacedMethods";
import { desanitizeAll } from "./sanitize";

export async function genClient(data: string | object) {
    const swagger = typeof data === "string" ? JSON.parse(data) : data;
    addIdForDefinitions(swagger);
    refPathToId(swagger);

    /** path related type definition strings */
    const allDefinitions = [];
    /** path related type definition objects (for dtsgen) */
    const allDefinitionSchemas = [];
    /** path related method content strings grouped by tags */
    const allMethods: {[name: string]: string[][]} = {};

    // walk paths to generate interfaces and methods
    const pathsObject = swagger.paths;
    for (const path of Object.keys(pathsObject)) {
        const pathItemObject = pathsObject[path];
        for (const _method of Object.keys(pathItemObject)) {
            const operation = pathItemObject[_method];
            const { definitions, definitionSchemas, method, tags } = genMethod(path, _method, operation);
            allDefinitions.push(...definitions);
            allDefinitionSchemas.push(...definitionSchemas);
            for (const tag of tags) {
                if (!allMethods[tag]) allMethods[tag] = [];
                allMethods[tag].push(method);
            }
        }
    }
    // add generated path related type defitinions to swagger schema's definitions key (for dtsgen)
    for (const definitionSchema of allDefinitionSchemas) {
        swagger.definitions[(definitionSchema as any).id] = definitionSchema;
    }

    /** all model definitions and generated path related type definitions */
    const dts = await dtsgen([swagger]);

    let allCode = "";
    allCode += dts;
    allCode += allDefinitions.join("\n");
    allCode += "\n";
    allCode += fs.readFileSync(`${__dirname}/../../src/lib/res/fetchApi.ts`, "utf8");
    allCode += "\n";
    allCode += genNamespacedMethods(allMethods);

    return desanitizeAll(allCode);
}
