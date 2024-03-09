let socketReplyDict = new Map();


function msgSend(socket, channel, message)
{
    socket.emit(channel, message);
}

function msgHook(socket, channel, callback)
{
    if (socketReplyDict.get(socket) == undefined)
        socketReplyDict.set(socket, {});
    let replyDict = socketReplyDict.get(socket);

    if (replyDict[channel] == undefined)
    {
        socket.on(channel, (obj) => {
            handleReply(replyDict, channel, obj);
        });
        replyDict[channel] = {base: callback, callbacks: []};
    }
}


function handleReply(replyDict, channel, obj)
{
    //console.log(`GOT REPLY: ${channel} ${JSON.stringify(obj)}`);
    if (replyDict[channel] != undefined)
    {
        let replyEntry = replyDict[channel];

        if (replyEntry.callbacks.length > 0)
        {
            let resolve = replyEntry.callbacks.shift();
            resolve(obj);
            return;
        }

        if (replyEntry.base != undefined)
        {
            replyEntry.base(obj);
            return;
        }

        logWarn(`Unhandled reply: ${channel} ${JSON.stringify(obj)}`);
    }
}

function msgSendAndGetReply(socket, channel, message)
{
    if (socketReplyDict.get(socket) == undefined)
        socketReplyDict.set(socket, {});
    let replyDict = socketReplyDict.get(socket);

    let replyPromise = new Promise(resolve =>
    {
        if (replyDict[channel] == undefined)
        {
            socket.on(channel, (obj) => {
                handleReply(replyDict, channel, obj);
            });
            replyDict[channel] = {base: undefined, callbacks: []};
        }
        replyDict[channel].callbacks.push(resolve);
    });

    socket.emit(channel, message);
    return replyPromise;
}