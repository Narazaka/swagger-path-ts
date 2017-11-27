/** fetch() wrapper function */
export type FetchFunc<Options> =
    /**
     * @param input fetch() input
     * @param init fetch() init
     * @param options any options on api call
     * @return fetch() return value
     */
    (input: RequestInfo, init?: RequestInit, options?: Options) => Promise<Response>;

/** fetch request parameters */
export interface RequestParams {
    /** query string object (ex. `{ q: "search" }`) */
    query?: {[name: string]: any};
    /** body json object (ex. `{ data: "aaa" }`) */
    body?: {[name: string]: any};
    /** headers object (ex. `{ "X-Foo": "bar" }`) */
    header?: {[name: string]: any};
}

/**
 * generate fetch wrapper function
 * @param fetchFunc fetch() function (you can pass wrapper function for fetch())
 * @param preprocess args preprocessors
 */
export function genFetchApi<Options>(
    fetchFunc: FetchFunc<Options> = fetch,
    preprocess: {
        query?(query?: {[name: string]: any}): {[name: string]: any};
        body?(query?: {[name: string]: any}): {[name: string]: any};
    } = {},
) {
    /**
     * fetch() wrapper
     * @param root path root (ex. `"https://example.com"`)
     * @param method request method (ex. `"get"`)
     * @param path path (ex. `/foo/bar`)
     * @param params fetch request parameters
     * @param options options on api call
     * @return response json data
     */
    function fetchApi(
        root: string,
        method: string,
        path: string,
        params: RequestParams = {},
        options?: Options,
    ) {
        const query = preprocess.query ? preprocess.query(params.query) : params.query;
        const body = preprocess.body ? preprocess.body(params.body) : params.body;
        const header = params.header || {};

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

        return fetchFunc(
            pathStr,
            { method, headers: new Headers(header), body: JSON.stringify(body) },
            options,
        );
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
