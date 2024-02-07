async function initMsgSystem()
{

}

async function sockReqMessages(socket)
{
    socket.emit('get-messages', {});
}

async function accSendRawMessage(account, userIdTo, data)
{
    let promises = [];
    for (let socket of serverSocketList)
        promises.push(accSendRawMessageSock(account, socket, userIdTo, data));
    await Promise.all(promises);

    let work = false;
    for (let promise of promises)
        if (await promise)
            work = true;

    return work;
}

async function accSendRawMessageSock(accountFrom, socketTo, userIdTo, data)
{
    let message = {from: accountFrom["userId"], to: userIdTo, data: data};
    let reply = await msgSendAndGetReply(socketTo, 'send-message', message);
    if (reply["error"] != undefined)
    {
        let socketIndex = serverSocketList.indexOf(socketTo);
        let addr = serverList[socketIndex];
        logWarn(`Error sending message to \"${addr}\": ${reply["error"]}`);
        return false;
    }
    return true;
}

async function _handleMessageSock(socketFrom, data)
{
    if (data === undefined)
        return logWarn(`Invalid message from ${socketFrom}:`, data);

    let userIdFrom = data["from"];
    let userIdTo = data["to"];
    let date;
    try {
        date = new Date(data["date"]);
    }
    catch (e) {
        return logWarn(`Invalid date from ${socketFrom}:`, data);
    }
    let msg = data["data"];

    if (userIdFrom === undefined || userIdTo === undefined || date === undefined || msg === undefined)
        return logWarn(`Invalid message from ${socketFrom}:`, data);

    handleMessageSock(socketFrom, userIdFrom, userIdTo, date, msg);
}

async function handleMessageSock(socketFrom, userIdFrom, userIdTo, date, data)
{
    logInfo(`Message from ${userIdFrom} to ${userIdTo} at ${date.toDateString()}:`, data);
}