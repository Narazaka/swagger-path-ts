/**
 * generate fetch wrapper function
 * @param fetchFunc fetch() function (you can pass wrapper function for fetch())
 * @param preprocess args preprocessors
 */
export function genFetchApi(
    fetchFunc = fetch,
    preprocess: {
        query?(query?: {[name: string]: any}): {[name: string]: any};
        body?(query: {[name: string]: any}): {[name: string]: any};
    } = {},
) {
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
    function fetchApi(
        root: string,
        method: string,
        path: string,
        query?: {[name: string]: any},
        body: {[name: string]: any} = {},
        header: {[name: string]: any} = {},
    ) {
        // tslint:disable-next-line no-parameter-reassignment
        if (preprocess.query) query = preprocess.query(query);
        // tslint:disable-next-line no-parameter-reassignment
        if (preprocess.body) body = preprocess.body(body);

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
        header["Content-Type"] = "application/json";

        return fetchFunc(pathStr, {
            method,
            headers: header,
            body: JSON.stringify(body),
        });
    }

    return fetchApi;
}

// tslint:disable-next-line no-magic-numbers
export interface OKResponse<ResponseType, StatusCode extends number = 200> extends Response {
    ok: true;
    status: StatusCode;
    json(): Promise<ResponseType>;
}

export interface NGResponse<ResponseType, StatusCode extends number> extends Response {
    ok: false;
    status: StatusCode;
    json(): Promise<ResponseType>;
}
