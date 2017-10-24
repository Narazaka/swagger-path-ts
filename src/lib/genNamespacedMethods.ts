export function genNamespacedMethods(allMethods: {[name: string]: string[][]}) {
    let code = "";
    code += "export const generateApi = (root: string) => ({\n";
    for (const tag of Object.keys(allMethods)) {
        const methods = allMethods[tag];
        code += `    ${tag}: {\n`;
        for (const method of methods) {
            for (const line of method) {
                code += `        ${line}\n`;
            }
        }
        code += "    },\n";
    }
    code += "});\n";

    return code;
}
