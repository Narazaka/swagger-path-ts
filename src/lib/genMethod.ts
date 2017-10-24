// tslint:disable no-reference
/// <reference path="../../node_modules/swagger.d.ts/swagger.d.ts" />

import { sanitize, sanitizeNoWord } from "./sanitize";

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
export function genMethod(path: string, _method: string, operation: Swagger.Operation) {
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
        } else if (response.schema.$ref && /^#(?!\/)/.test(response.schema.$ref)) { // $ref: "#IFoo" etc.
            definitions.push(`export type ${typeName} = ${response.schema.$ref.slice(1)};\n`);
        } else {
            definitions.push(`export type ${typeName} = any; // TODO ${response.schema.type}\n`);
        }
    }

    // generate method

    // path
    const pathCode = path.split("/").map((part) => part[0] === "{" ? `$${part}` : part).join("/");
    // params
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
    // return type
    const responseTypes = [];
    for (const status of Object.keys(operation.responses)) {
        const statusCode = Number(status);
        const returnType = `${sanitize(`${operation.operationId}${statusCodeToMessage(status)}Response`)}`;
        // tslint:disable-next-line binary-expression-operand-order no-magic-numbers
        if (200 <= statusCode && statusCode < 300) {
            responseTypes.push(`OKResponse<${returnType}, ${statusCode}>`);
        } else {
            responseTypes.push(`NGResponse<${returnType}, ${statusCode}>`);
        }
    }

    // build method code
    const method = [];
    method.push("/**");
    for (const methodDescription of methodDescriptions) {
        method.push(` * @param ${methodDescription}`);
    }
    method.push(" */");
    method.push(`async ${sanitizeNoWord(operation.operationId || "")}(`);
    for (const methodSignature of methodSignatures) {
        method.push(`    ${methodSignature},`);
    }
    method.push(") {");
    method.push("    return (");
    method.push(`        await fetchApi(root, ${fetchApiParams.join(", ")})`);
    method.push("    ) as (");
    for (let i = 0; i < responseTypes.length; ++i) {
        const responseType = responseTypes[i];
        const postfix = i === responseTypes.length - 1 ? "" : " |";
        method.push(`        ${responseType}${postfix}`);
    }
    method.push("    );\n");
    method.push("},");

    const tags = operation.tags || [] as string[];
    if (!tags.length) tags.push("NO_TAG");

    return { definitions, definitionSchemas, method, tags };
}
