/** sanitize */
export const sanitize = (name: string) =>
/^[A-Za-z0-9_]$/.test(name) ? name : `${encodeURIComponent(sanitizeNoWord(name)).replace(/%/g, "PERCENT")}SANITIZED`;

/** desanitize */
export const desanitizeAll = (str: string) =>
    str.replace(/\b(\w+PERCENT\w+)SANITIZED/g, (_all, part) =>
        decodeURIComponent(part.replace(/PERCENT/g, "%")));

/** sanitize non \w chars */
export const sanitizeNoWord = (name: string) => name.replace(/[、・＆&／？?, ]/g, "＿");
