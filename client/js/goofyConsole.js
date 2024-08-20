let goofyConsoleEnabled = settingsObj["goofy-console"]["enabled"];
let goofyConsoleLog = true;
let goofyConsoleAutoScroll = true;

const goofyConsoleDiv = document.getElementById("settings-goofy-console");
const goofyConsoleUlDiv = document.getElementById("settings-goofy-console-list-div");
const goofyConsoleListUl = document.getElementById("settings-goofy-console-list-ul");
const goofyConsoleInput = document.getElementById("settings-goofy-console-input");

let ogConsole = window.console;
let fakeConsole = undefined;
let consoleMsgs = [];

function createFakeConsoleEntry(level, args, add) {
    let li = document.createElement("li");

    let timeStr = (new Date()).toISOString().substring(11,19);
    let spanTime = document.createElement("span");
    spanTime.classList.add("goofy-console-time");
    spanTime.textContent = timeStr + " ";

    let spanLevel = document.createElement("span");
    spanLevel.classList.add(`goofy-console-${level.toLowerCase()}`);

    let spanMsg = document.createElement("span");
    spanMsg.classList.add("goofy-console-msg");

    spanLevel.textContent = level;

    let msg = "";
    for (let i = 0; i < args.length; i++) {
        if (i > 0)
            msg += " ";

        let argStr = JSON.stringify(args[i]);
        if (argStr === undefined)
            argStr = "undefined";
        else if (argStr === null)
            argStr = "null";

        if (argStr.startsWith("\"") && argStr.endsWith("\""))
            argStr = argStr.substring(1, argStr.length - 1);

        if (argStr.length > 100) // get first 100, then ... then last 5
        {
            argStr = argStr.substring(0, 100) + " [...] " + argStr.substring(argStr.length - 5);
            spanMsg.onclick = function () {
                alert(JSON.stringify(args[i], null, 2));
            };
        }
        msg += argStr;
    }

    spanMsg.textContent = msg;

    li.appendChild(spanTime);
    li.appendChild(spanLevel);
    li.appendChild(spanMsg);

    if (add)
        goofyConsoleListUl.appendChild(li);
    if (goofyConsoleAutoScroll)
        goofyConsoleUlDiv.scrollTop = goofyConsoleUlDiv.scrollHeight;

    return li;
}

function createFakeConsole() {
    fakeConsole = {};
    fakeConsole.log = function () {
        let args = Array.from(arguments);
        consoleMsgs.push(args);
        createFakeConsoleEntry("LOG", args, true);
        if (goofyConsoleLog)
            ogConsole.log(...args);
    }
    fakeConsole.info = function () {
        let args = Array.from(arguments);
        consoleMsgs.push(args);
        createFakeConsoleEntry("INFO", args, true);
        if (goofyConsoleLog)
            ogConsole.info(...args);
    }
    fakeConsole.warn = function () {
        let args = Array.from(arguments);
        consoleMsgs.push(args);
        createFakeConsoleEntry("WARN", args, true);
        if (goofyConsoleLog)
            ogConsole.warn(...args);
    }
    fakeConsole.error = function () {
        let args = Array.from(arguments);
        consoleMsgs.push(args);
        createFakeConsoleEntry("ERROR", args, true);
        if (goofyConsoleLog)
            ogConsole.error(...args);
    }
    fakeConsole.clear = function () {
        consoleMsgs = [];
        goofyConsoleListUl.innerHTML = "";
    }
    fakeConsole.trace = function () {
        let args = Array.from(arguments);
        consoleMsgs.push(args);
        createFakeConsoleEntry("TRACE", args, true);
        if (goofyConsoleLog)
            ogConsole.trace(...args);
    }
}

function checkGoofyConsole() {
    goofyConsoleEnabled = settingsObj["goofy-console"]["enabled"];
    if (goofyConsoleEnabled) {
        window.console = fakeConsole;
        goofyConsoleDiv.style.display = "block";
    } else {
        window.console = ogConsole;
        goofyConsoleDiv.style.display = "none";
    }
}

function initGoofyConsole() {
    createFakeConsole();
    checkGoofyConsole();
}

initGoofyConsole();


function goofyConsoleInputKey(event) {
    if (event.key === "Enter") {
        let input = goofyConsoleInput.value;
        if (input === "clear") {
            fakeConsole.clear();
        } else {
            try {
                fakeConsole.info(`${input} -> `, eval(input));
            } catch (e) {
                fakeConsole.error(`${input} -> `, e.message);
            }
        }
        goofyConsoleInput.value = "";
    }
}