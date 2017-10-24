/**
 * fetch() wrapper
 * @param root path root (ex. `"https://example.com"`)
 * @param method request method (ex. `"get"`)
 * @param path path (ex. `/foo/bar`)
 * @param query query string object (ex. `{ q: "search" }`)
 * @param body body json object (ex. `{ data: "aaa" }`)
 * @param header headers object (ex. `{ "X-Foo": "bar" }`)
 * @return response json data
 */
async function fetchApi(root: string, method: string, path: string, query?: any, body?: any, header?: any) {
    let pathStr = `${root}${path}`;
    if (query) {
        const queryStrings = [];
        for (const name of Object.keys(query)) {
            const value = query[name];
            // tslint:disable-next-line no-null-keyword
            if (value != null) queryStrings.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
        }
        if (Object.keys(queryStrings).length) {
            pathStr += `?${queryStrings.join("&")}`;
        }
    }
    const response = await fetch(pathStr, {
        method,
        headers: header,
        body: JSON.stringify(body),
    });

    return await response.json();
}
