/**
 * replace swagger schema definition references to id references
 *
 * the dtsgenerator makes interfaces by definitions' ids
 */

/**
 * add ID to definitions
 * @param schema swagger schema
 */
export function addIdForDefinitions(schema: any) {
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

/**
 * replace definition reference to id reference recursively
 * @param node swagger schema node
 */
export function refPathToId(node: any) {
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
