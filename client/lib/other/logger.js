let logEnabled = true;

let logTxtEnabled = true;
let logInfoEnabled = true;
let logWarnEnabled = true;
let logErrorEnabled = true;

let logAddTimeStamp = false;

function getWithTimeStampIfNeeded(txt)
{
    if (logAddTimeStamp)
        return `[${new Date().toLocaleTimeString()}] ${txt}`;
    return txt;
}

function toStr(thing)
{
    if (typeof thing === "string")
        return thing;
    return JSON.stringify(thing);
}

function toOneStr(arr)
{
    if (typeof arr === "string")
        return arr;

    let tempStr = "";
    for (let str of arr)
        tempStr += toStr(str) + " ";
    return tempStr;
}

function _logExtra(level, arr)
{
    if (!logEnabled)
        return;

    let str = "";
    if (level !== undefined && level !== "")
        str = `${level}:`;
    console.log(str, ...arr)

    // let txt = toOneStr(arr);
    // if (level === undefined || level === "")
    //     console.log(getWithTimeStampIfNeeded(`${txt}`));
    // else
    //     console.log(getWithTimeStampIfNeeded(`${level}: ${txt}`));
}

function logTxt(...arr)
{
    if (logTxtEnabled)
        _logExtra("", arr);
}

function logInfo(...arr)
{
    if (logInfoEnabled)
        _logExtra("INFO", arr);
}

function logWarn(...arr)
{
    if (logWarnEnabled)
        _logExtra("WARN", arr);
}

function logError(...arr)
{
    if (logErrorEnabled)
    {
        _logExtra("ERROR", arr);
        console.trace(arr);
    }
}

function logFatalErrorAndCrash(...arr)
{
    if (logErrorEnabled)
    {
        _logExtra("FATAL ERROR", arr);
        console.trace(arr);
    }

    throw `FATAL ERROR: ${toOneStr(arr)}`;
}