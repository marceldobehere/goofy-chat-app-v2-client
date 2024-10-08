async function initMsgSystem()
{

}

async function sockReqMessages(socket)
{
    socket.emit('get-messages', {});
}

async function accSendRawMessage(account, userIdTo, data, onlyTrySend)
{
    await setStatus("Send Msg");
    let promises = [];
    for (let socket of serverSocketList)
        promises.push(accSendRawMessageSock(account, socket, userIdTo, data, onlyTrySend));
    await Promise.all(promises);

    let work = false;
    for (let promise of promises)
        if (await promise)
            work = true;

    await setStatus("Ready")
    return work;
}

async function accSendRawMessageSock(accountFrom, socketTo, userIdTo, data, onlyTrySend)
{
    let message = {from: accountFrom["userId"], to: userIdTo, data: data, store: !onlyTrySend};
    let reply = await msgSendAndGetReply(socketTo, 'send-message', message);
    if (reply["error"] != undefined)
    {
        let socketIndex = serverSocketList.indexOf(socketTo);
        let addr = serverList[socketIndex];
        logWarn(`Error sending message to \"${addr}\": ${reply["error"]}`);
        //alert(`Error sending message to \"${addr}\": ${reply["error"]}`);
        return false;
    }
    return true;
}



async function _handleMessageSock(socketFrom, data)
{
    await lockIncoming.enable();
    await setStatus("Rec Msg");

    try {
        if (data === undefined)
        {
            lockIncoming.disable()
            return logWarn(`Invalid message from ${socketFrom}:`, data);
        }

        let userIdFrom = data["from"];
        let userIdTo = data["to"];
        let date;
        try {
            date = new Date(data["date"]);
        }
        catch (e) {
            lockIncoming.disable();
            return logWarn(`Invalid date from ${socketFrom}:`, data);
        }
        let msg = data["data"];

        if (userIdFrom === undefined || userIdTo === undefined || date === undefined || msg === undefined)
        {
            lockIncoming.disable();
            await setStatus("Ready");
            return logWarn(`Invalid message from ${socketFrom}:`, data);
        }

        await handleMessageSock(socketFrom, userIdFrom, userIdTo, date, msg);
    }
    catch (e) {
        logError(e);
    }

    lockIncoming.disable();
    await setStatus("Ready");
}

async function sendUserNewSymmKey(accountFrom, userIdTo, symmKey)
{
    let data = {
        type: "symm-key",
        symmKey: symmKey,
        messageId: getRandomIntInclusive(0, 99999999999)
    };

    return await sendRsaMessageToUser(accountFrom, userIdTo, data);
}

async function sendAesMessageToUser(accountFrom, userIdTo, data, onlyTrySend, skipLock)
{
    if (!skipLock)
        await lockOutgoingAes.enable();
    try {
        let symmKey = await getUserMySymmKey(accountFrom, userIdTo);
        if (symmKey == undefined)
        {
            logError(`No symm key for user ${userIdTo}`);
            if (!skipLock)
                lockOutgoingAes.disable();
            return false;
        }

        let dataEnc = aesEncrypt(JSON.stringify(data), symmKey);

        let msgObj = {
            type: "aes",
            data: dataEnc
        }

        let res = await accSendRawMessage(accountFrom, userIdTo, msgObj, onlyTrySend);
        if (!skipLock)
            lockOutgoingAes.disable();
        return res;
    }
    catch (e) {
        logError(e);
        if (!skipLock)
            lockOutgoingAes.disable();
        return false;
    }
    if (!skipLock)
        lockOutgoingAes.disable();
}

async function _sendAesMessageToUser(accountFrom, userIdTo, data, symmKey)
{
    let dataEnc = aesEncrypt(JSON.stringify(data), symmKey);

    let msgObj = {
        type: "aes",
        data: dataEnc
    }

    return await accSendRawMessage(accountFrom, userIdTo, msgObj);
}

async function sendRsaMessageToUser(accountFrom, userIdTo, data)
{
    await lockOutgoingRsa.enable();

    try {
        let pubKey = await getPublicKeyFromUser(userIdTo);
        if (pubKey === undefined)
        {
            logError(`User not found on server`);
            lockOutgoingRsa.disable();
            return false;
        }

        let rsaStrList = await StringIntoRsaStringListAsync(JSON.stringify(data), pubKey);
        let sig = createSignature(data, accountFrom["private-key"]);
        let msgObj = {
            type: "rsa",
            data: rsaStrList,
            signature: sig
        }

        let res = await accSendRawMessage(accountFrom, userIdTo, msgObj);
        lockOutgoingRsa.disable();
        return res;
    }
    catch (e) {
        logError(e);
        lockOutgoingRsa.disable();
        return false;
    }
    lockOutgoingRsa.disable();
}

async function sendSecureMessageToUser(accountFrom, userIdTo, data, type, onlyTrySend, dontActuallyAdd, skipLock)
{
    if (!skipLock)
    {
        await lockOutgoing.enable();
        await lockIncoming.enable();
    }
    let res;

    try {
        let msg = {
            messageId: getRandomIntInclusive(0, 99999999999),
            data: data,
            type: type
        };

        res = await sendAesMessageToUser(accountFrom, userIdTo, msg, onlyTrySend, skipLock);

        msg["date"] = new Date();
        msg["from"] = accountFrom["userId"];

        await addSentMessage(accountFrom, userIdTo, msg, dontActuallyAdd);
    }
    catch (e) {
        logError(e);
        res = undefined;
    }

    if (!skipLock)
    {
        lockOutgoing.disable();
        lockIncoming.disable();
    }

    return res;
}

async function handleMessageSock(socketFrom, userIdFrom, userIdTo, date, data)
{
    logInfo(`> Message from ${userIdFrom} to ${userIdTo} at ${date.toDateString()}:`, data);
    if (data === undefined || data["type"] === undefined)
        return logWarn(`Invalid message from ${userIdFrom} to ${userIdTo}:`, data);

    if (data["type"] === "aes")
    {
        let symmKey = await getUserLastSymmKey(currentUser["mainAccount"], userIdFrom);
        if (symmKey == undefined)
            return logWarn(`No last symm key for user ${userIdFrom}`);
        let dataStr = await aesDecrypt(data["data"], symmKey);
        let dataObj = JSON.parse(dataStr);
        await addMessageToUser(currentUser["mainAccount"], userIdFrom, userIdFrom, dataObj, date);
    }
    else if (data["type"] === "rsa")
    {
        let privKey = currentUser["mainAccount"]["private-key"];
        if (privKey == undefined)
            return logWarn(`No private key for user ${currentUser["mainAccount"]["userId"]}`);
        let dataStr = await rsaStringListIntoStringAsync(data["data"], privKey);
        let dataObj = JSON.parse(dataStr);

        let sig = data["signature"];
        let pubKey = await getPublicKeyFromUser(userIdFrom);
        if (pubKey === undefined)
        {
            logError(`User not found on server`);
            return;
        }
        if (!verifySignature(dataObj, sig, pubKey))
        {
            logError(`Invalid signature from ${userIdFrom} to ${userIdTo}:`, data);
            return;
        }

        await addMessageToUser(currentUser["mainAccount"], userIdFrom, userIdFrom, dataObj, date);
    }
    else
        return logWarn(`Invalid message type from ${userIdFrom} to ${userIdTo}:`, data);
}