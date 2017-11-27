export function genNamespacedMethods(allMethods: {[name: string]: string[][]}) {
    let code = "";
    code += "export const generateApi = <Options = any>(root: string, fetchFunc: FetchFunc<Options> = fetch) => {\n";
    code += "    const fetchApi = genFetchApi(fetchFunc);\n";
    code += "\n";
    code += "    return {\n";
    for (const tag of Object.keys(allMethods)) {
        const methods = allMethods[tag];
        code += `        ${tag}: {\n`;
        for (const method of methods) {
            for (const line of method) {
                code += `            ${line}\n`;
            }
        }
        code += "        },\n";
    }
    code += "    };\n";
    code += "};\n";

    return code;
}
