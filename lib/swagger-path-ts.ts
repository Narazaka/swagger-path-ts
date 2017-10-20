/// <reference types="node" />
/// <reference path="../node_modules/swagger.d.ts/swagger.d.ts" />

import * as fs from "fs";
const dtsgen = require("dtsgenerator").default;

process.stdin.setEncoding("utf8");
process.stdin.resume();

let stdinData = "";

process.stdin.on("data", function(chunk) {
    stdinData += chunk;
});

process.stdin.on("close", function() {
    processData(stdinData);
    process.exit();
});

process.stdin.on("end", async function() {
    await processData(stdinData);
    process.exit();
});

function addIdForDefinitions(schema: any) {
    if (!schema.definitions) return schema;
    for (const name of Object.keys(schema.definitions)) {
        const value = schema.definitions[name];
        value.id = `#I${name}`;
        if (value.examples && typeof value.examples === "object") {
            value.examples.id = `#I${name}-examples`;
        }
        if (value.example && typeof value.example === "object") {
            value.example.id = `#I${name}-example`;
        }
    }

    return schema;
}

function refPathToId(node: any) {
    if (node instanceof Array) {
        for (const childNode of node) refPathToId(childNode);
        // tslint:disable-next-line no-null-keyword
    } else if (node != null && typeof node === "object") {
        if (node.$ref && /^#\/definitions\//.test(node.$ref)) {
            node.$ref = node.$ref.replace(/^#\/definitions\//, "#I");
        }
        for (const name of Object.keys(node)) refPathToId(node[name]);
    }
}

async function processData(data: string) {

    const swagger = JSON.parse(data);
    addIdForDefinitions(swagger);
    refPathToId(swagger);

    const allDefinitions = [];
    const allDefinitionSchemas = [];
    const allMethods = [];
    const pathsObject = swagger.paths;
    for (const path of Object.keys(pathsObject)) {
        const pathItemObject = pathsObject[path];
        for (const _method of Object.keys(pathItemObject)) {
            const operation = pathItemObject[_method];
            const { definitions, definitionSchemas, method } = genMethod(path, _method, operation);
            allDefinitions.push(...definitions);
            allDefinitionSchemas.push(...definitionSchemas);
            allMethods.push(method);
        }
    }
    for (const definitionSchema of allDefinitionSchemas) {
        swagger.definitions[(definitionSchema as any).id] = definitionSchema;
    }

    // console.log(JSON.stringify(swagger, null, "  "));

    const dts = await dtsgen([swagger]);
    console.log(dts);
    console.log(allDefinitions.join("\n"));
    console.log(fs.readFileSync(`${__dirname}/fetchApi.ts`, "utf8"));
    console.log("export class Api {");
    console.log(allMethods.join("\n"));
    console.log("}");
}

const sanitize = (name: string) => /^[A-Za-z0-9_]$/.test(name) ? name : encodeURIComponent(name).replace(/%/g, "PP");

const sanitizeSoft = (name: string) => name.replace(/[、・＆&／？?, ]/g, "_");

const parameterName =
    (operation: Swagger.Operation, type: string) => sanitize(`${operation.operationId}${type}Parameter`);

function genParameterInterface(name: string, parameters: Swagger.Parameter[]) {
    const schema: any = {};
    schema.id = name;
    schema.type = "object";
    schema.required = [];
    const properties: any = schema.properties = {};
    for (const parameter of parameters) {
        properties[parameter.name] = {
            description: parameter.description,
            type: (parameter as any).type,
        };
        if (parameter.required) schema.required.push(parameter.name);
    }

    return schema;
}

function convertType(type: string) {
    switch (type) {
        case "integer": return "number";
        default: return type;
    }
}

function statusCodeToMessage(statusCode: string | number) {
    // tslint:disable no-magic-numbers
    switch (Number(statusCode)) {
        case 200: return "OK";
        case 204: return "NoContent";
        case 400: return "BadRequest";
        case 401: return "Unauthorized";
        case 402: return "PaymentRequired";
        case 403: return "Forbidden";
        case 404: return "NotFound";
        case 500: return "InternalServerError";
        default: return "UNKNOWN";
    }
    // tslint:enable no-magic-numbers
}

// tslint:disable-next-line cyclomatic-complexity
function genMethod(path: string, _method: string, operation: Swagger.Operation) {
    const definitions: string[] = [];
    const definitionSchemas: object[] = [];
    let methodSignatures: string[] = [];
    let methodDescriptions: string[] = [];
    let queryExists = false;
    let headerExists = false;
    let cookieExists = false;
    let bodyExists = false;
    if (operation.parameters) {
        const queryParameters = operation.parameters.filter((p) => p.in === "query");
        const headerParameters = operation.parameters.filter((p) => p.in === "header");
        const pathParameters = operation.parameters.filter((p) => p.in === "path");
        const cookieParameters = operation.parameters.filter((p) => p.in === "cookie");
        const bodyParameters = operation.parameters.find((p) => p.in === "body"); // OpenAPI 2.0
        queryExists = Boolean(queryParameters.length);
        headerExists = Boolean(headerParameters.length);
        cookieExists = Boolean(cookieParameters.length);
        bodyExists = Boolean(bodyParameters);
        if (queryExists)
            definitionSchemas.push(genParameterInterface(parameterName(operation, "Query"), queryParameters));
        if (headerExists)
            definitionSchemas.push(genParameterInterface(parameterName(operation, "Header"), queryParameters));
        if (cookieExists)
            definitionSchemas.push(genParameterInterface(parameterName(operation, "Cookie"), queryParameters));
        if (bodyParameters) {
            const schema = (bodyParameters as any).schema;
            schema.id = parameterName(operation, "Body");
            definitionSchemas.push(schema);
        }
        const queryRequired = queryParameters.some((parameter) => Boolean(parameter.required));
        const headerRequired = headerParameters.some((parameter) => Boolean(parameter.required));
        const pathRequired = pathParameters.length;
        const cookieRequired = cookieParameters.some((parameter) => Boolean(parameter.required));
        const bodyRequired = bodyParameters && (
            bodyParameters.required || (
                (bodyParameters as any).schema &&
                (bodyParameters as any).schema.required &&
                (bodyParameters as any).schema.required.length
            )
        );
        if (pathRequired) {
            methodSignatures = pathParameters.map((parameter) =>
                `${parameter.name}: ${convertType((parameter as any).type)}`,
            );
            methodDescriptions = pathParameters.map((parameter) =>
                `${parameter.name} ${parameter.description}`,
            );
        }
        if (queryExists) {
            methodSignatures.push(`query${queryRequired ? "" : "?"}: ${parameterName(operation, "Query")}`);
            methodDescriptions.push("query query");
        }
        if (headerExists) {
            methodSignatures.push(`header${headerRequired ? "" : "?"}: ${parameterName(operation, "Header")}`);
            methodDescriptions.push("header header");
        }
        if (cookieExists) {
            methodSignatures.push(`cookie${cookieRequired ? "" : "?"}: ${parameterName(operation, "Cookie")}`);
            methodDescriptions.push("cookie cookie");
        }
        if (bodyParameters) {
            methodSignatures.push(`body${bodyRequired ? "" : "?"}: ${parameterName(operation, "Body")}`);
            methodDescriptions.push("body body");
        }
    }
    for (const status of Object.keys(operation.responses)) {
        const response = operation.responses[status];
        if (!response.schema) continue;
        const typeName = sanitize(`${operation.operationId}${statusCodeToMessage(status)}Response`);
        if (response.schema.type === "object") {
            (response.schema as any).id = typeName;
            definitionSchemas.push(response.schema);
        } else {
            definitions.push(`export type ${typeName} = any; // TODO ${response.schema.type}\n`);
        }
    }
    const pathCode = path.split("/").map((part) => part[0] === "{" ? `$${part}` : part).join("/");
    const fetchApiParams = [
        `"${_method}"`,
        `\`${pathCode}\``,
        queryExists ? "query" : "undefined",
        bodyExists ? "body" : "undefined",
        headerExists ? "header" : "undefined",
    ];
    for (let i = fetchApiParams.length - 1; i >= 0; --i) {
        if (fetchApiParams[i] !== "undefined") break;
        fetchApiParams.pop();
    }
    const method = `
    /**
${methodDescriptions.map((d) => `     * ${d}\n`).join("")}
    */
    async ${sanitizeSoft(operation.operationId || "")}(${methodSignatures.map((s) => `\n        ${s},`).join("")}
    ) {
        return (await fetchApi(${fetchApiParams.join(", ")})) as ${sanitize(`${operation.operationId}OKResponse`)};
    }
    `;

    return { definitions, definitionSchemas, method };
}
