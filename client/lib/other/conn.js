function tryExtFn(fn, ...args)
{
    if (fn != undefined)
        try {
            return fn(...args);
        }
        catch (e) {
            logError(e);
        }
    return undefined;
}

async function tryExtAsyncFn(fn, ...args)
{
    if (fn != undefined)
        try {
            return await fn(...args);
        }
        catch (e) {
            logError(e);
        }
    return undefined;
}