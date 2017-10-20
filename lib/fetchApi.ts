async function fetchApi(method: string, path: string, query?: any, body?: any, header?: any) {
    let pathStr = path;
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
