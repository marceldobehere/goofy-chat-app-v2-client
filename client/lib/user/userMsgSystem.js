async function initUserMsgSystem()
{

}

function privateSymmKey(account)
{
    let userId = account["userId"];
    let pubKey = userPubKeyDict[userId];
    if (pubKey === undefined)
    {
        pubKey = hashString(account["private-key"])+"";
        userPubKeyDict[userId] = pubKey;
        saveObject("userPubKeyDict", userPubKeyDict);
    }

    return userPubKeyDict[userId];
}


async function getUserMySymmKey(account, userId)
{
    if (userId == account["userId"])
        return privateSymmKey(account);

    let initialMsg = false;

    await lockSymmKey.enable();
    try {
        let symmKey = loadAccountObject(account, `USER_MY_SYMM_KEY_${userId}`);
        logInfo(`Symm key for ${userId}:`, symmKey);
        if (symmKey == undefined)
        {
            symmKey = generateSymmKey();
            if (!await sendUserNewSymmKey(account, userId, symmKey))
            {
                logError(`Failed to send new symm key to ${userId}`);
                lockSymmKey.disable();
                return undefined;
            }
            logInfo(`Setting symm key for ${userId}:`, symmKey);
            await setUserMySymmKey(account, userId, symmKey);
            initialMsg = true;
        }

        lockSymmKey.disable();

        if (initialMsg)
        {
            logInfo("Initial message");
            try {
                let info = getOwnAccountChatInfo(account);
                info = tryConformUserChatInfo(info);
                await sendNewUserChatInfo(account, userId, info, true);

            } catch (e) {
                logError(e);
            }
        }


        return symmKey;
    }
    catch (e) {
        lockSymmKey.disable();
        logError(e);
        return undefined;
    }
    lockSymmKey.disable();
}

async function setUserMySymmKey(account, userId, key, dontRedirect)
{
    let lastKey = loadAccountObject(account, `USER_MY_SYMM_KEY_${userId}`);
    if (lastKey == key)
        return;

    saveAccountObject(account, `USER_MY_SYMM_KEY_${userId}`, key);

    if (dontRedirect)
        return;

    // send read-message to redirects
    logInfo(`Sending remote-symm-key of ${userId} to redirects:`, key);
    let msg = {
        messageId: getRandomIntInclusive(0, 99999999999),
        data: {userId: userId, symmKey: key},
        type: "remote-my-symm-key"
    };

    let accountFrom = currentUser["mainAccount"];

    msg["date"] = new Date();
    msg["from"] = accountFrom["userId"];

    await addSentMessage(accountFrom, userId, msg, true);
}

async function getUserLastSymmKey(account, userId)
{
    if (userId == account["userId"])
        return privateSymmKey(account);

    return loadAccountObject(account, `USER_SYMM_KEY_${userId}`);
}

async function setUserLastSymmKey(account, userId, key, dontRedirect)
{
    let lastKey = await getUserLastSymmKey(account, userId);
    if (lastKey == key)
        return;

    saveAccountObject(account, `USER_SYMM_KEY_${userId}`, key);

    if (dontRedirect)
        return;

    // send read-message to redirects
    logInfo(`Sending remote-symm-key of ${userId} to redirects:`, key);
    let msg = {
        messageId: getRandomIntInclusive(0, 99999999999),
        data: {userId: userId, symmKey: key},
        type: "remote-symm-key"
    };

    let accountFrom = currentUser["mainAccount"];

    msg["date"] = new Date();
    msg["from"] = accountFrom["userId"];

    await addSentMessage(accountFrom, userId, msg, true);
}

const dontRedirectTypes = ["redirect", "call-start", "call-stop", "call-reply", "call-join", "call-join-fail", "ice-candidate"];

async function addMessageToUser(account, userIdFrom, chatUserId, message, date)
{
    message["date"] = date;
    message["from"] = userIdFrom;
    logInfo(`Adding message to user ${chatUserId}:`, message);
    let type = message["type"];
    let messageId = message["messageId"];
    if (messageId == undefined)
    {
        logWarn(`Message without messageId:`, message);
        return;
    }

    if (!await messageIdInUser(account, chatUserId, messageId) && !dontRedirectTypes.includes(type))
    {
        await addMessageIdToUser(account, chatUserId, messageId);

        if (currentUser["redirectAccounts"].length > 0)
        {
            let msg = {
                messageId: getRandomIntInclusive(0, 99999999999),
                data: message,
                type: "redirect"
            };


            for (let i = 0; i < currentUser["redirectAccounts"].length; i++)
            {
                let redirect = currentUser["redirectAccounts"][i];

                logInfo(`Redirecting message to ${redirect}:`, message);
                await _sendAesMessageToUser(account, redirect, msg, privateSymmKey(account));
            }
        }
    }
    else if (!dontRedirectTypes.includes(type))
    {
        logWarn(`Message already in user:`, message);
        return;
    }


    if (type == "symm-key")
    {
        logInfo("Setting symm key");
        let symmKey = message["symmKey"];
        await setUserLastSymmKey(account, chatUserId, symmKey);
    }
    else if (type == "chat-info")
    {
        let info = message["data"];
        info = tryConformUserChatInfo(info);

        let localInfo = getUserChatInfo(account, chatUserId);
        //console.log(localInfo);
        localInfo = mergeUserChatInfo(localInfo, info);
        setUserChatInfo(account, chatUserId, localInfo);

        //console.log(info);
    }
    else if (type == "group-chat-msg")
    {
        await handleGroupMessage(account, message["data"]);
    }
    else if (type == "group-chat-join-invite")
    {
        await handleGroupInvite(account, message);
    }
    else if (type == "group-chat-kick")
    {
        await handleGroupKick(account, message);
    }
    else if (type == "group-chat-leave")
    {
        await handleGroupLeave(account, message);
    }
    else if (type == "group-chat-info")
    {
        await handleGroupInfoUpdate(account, message);
    }
    else if (type == "text")
    {
        await addNormalMessageToUser(account, chatUserId, message);
    }
    else if (type == "redirect")
    {
        logInfo("Redirect message", message);

        if (message["to"] == undefined)
            await addMessageToUser(account, message["data"]["from"], message["data"]["from"], message["data"], message["data"]["date"]);
        else
            await addMessageToUser(account, account['userId'], message["to"], message["data"], message["data"]["date"]);
    }
    else if (type == "remote-symm-key")
    {
        if (message["from"] != account["userId"])
            return logWarn("Invalid remote-symm-key message:", message);

        let newSymmKey = message["data"]["symmKey"];
        let remoteUserId = message["data"]["userId"];

        logInfo(`Setting remote symm key for ${remoteUserId}:`, newSymmKey);
        await setUserLastSymmKey(account, remoteUserId, newSymmKey, true);
    }
    else if (type == "remote-my-symm-key")
    {
        if (message["from"] != account["userId"])
            return logWarn("Invalid remote-my-symm-key message:", message);

        let newSymmKey = message["data"]["symmKey"];
        let remoteUserId = message["data"]["userId"];

        logInfo(`Setting remote my symm key for ${remoteUserId}:`, newSymmKey);
        await setUserMySymmKey(account, remoteUserId, newSymmKey, true);
    }
    else if (type == "read-message")
    {
        if (message["from"] != account["userId"])
            return logWarn("Invalid add-redirect message:", message);

        let readUserId = message["data"]["userId"];

        await readMessages(account, readUserId);
    }
    else if (type == "add-redirect")
    {
        if (message["from"] != account["userId"])
            return logWarn("Invalid add-redirect message:", message);

        let newUserId = message["data"]["userId"];
        currUserAddRedirect(newUserId);

        logInfo(`Adding User ${newUserId} to redirect list`);
    }
    else if (type == "call-start")
    {
        tryExtFn(extFnVcOnReceiveCallOffer, account, chatUserId, message["data"]);
    }
    else if (type == "call-stop")
    {
        tryExtFn(extFnVcOnReceiveHangup, account, chatUserId, message["data"]);
    }
    else if (type == "call-reply")
    {
        tryExtFn(extFnVcOnReceiveCallReply, account, chatUserId, message["data"]);
    }
    else if (type == "call-join")
    {
        tryExtFn(extFnVcOnMemberJoin, account, chatUserId, message["data"]);
    }
    else if (type == "call-join-fail")
    {
        tryExtFn(extFnVcOnMemberJoinFailed, account, chatUserId, message["data"]);
    }
    else if (type == "ice-candidate")
    {
        tryExtFn(extFnVcOnReceiveIceCandidate, account, chatUserId, message["data"]);
    }
    else
    {
        logWarn(`Unknown message type: ${type}`);
    }
}

async function addSentMessage(account, userIdTo, message, dontActuallyAdd)
{
    let type = message["type"];
    let messageId = message["messageId"];

    await readMessages(account, userIdTo);

    if (dontRedirectTypes.includes(type))
    {
        logInfo(`Not saving sent message to ${userIdTo}:`, message);
        return;
    }

    if (!await messageIdInUser(account, userIdTo, messageId))
    {
        await addMessageIdToUser(account, userIdTo, messageId);

        if (currentUser["redirectAccounts"].length > 0)
        {
            let msg = {
                messageId: getRandomIntInclusive(0, 99999999999),
                data: message,
                type: "redirect",
                to: userIdTo
            };

            for (let i = 0; i < currentUser["redirectAccounts"].length; i++)
            {
                let redirect = currentUser["redirectAccounts"][i];

                logInfo(`Redirecting message to ${redirect}:`, msg);
                await _sendAesMessageToUser(account, redirect, msg, privateSymmKey(account));
            }
        }
    }
    else
    {
        logWarn(`Message already in user:`, message);
        return;
    }


    logInfo(`New sent message to user ${userIdTo}:`, message);
    if (!dontActuallyAdd)
    {
        userSortedAdd(account, userIdTo);
        await internalAddUserMessageSorted(account, userIdTo, message);
        await extMsgNormalMessage(account, userIdTo, message);
    }
}

async function addNormalMessageToUser(account, chatUserId, message)
{
    logInfo(`New message from user ${chatUserId}:`, message);
    if (isStrChannelFromGroup(chatUserId))
        logWarn("Group messages not implemented yet");
    else
        addUserIdIfNotExists(chatUserId);


    await internalAddUserMessageSorted(account, chatUserId, message);
    await addMessageToUnread(account, chatUserId, message);
    userSortedAdd(account, chatUserId);
    tryExtFn(extMsgNormalMessage, account, chatUserId, message);
}

let extFnVcInit = undefined;
let extFnVcOnReceiveCallOffer = undefined;
let extFnVcOnReceiveHangup = undefined;
let extFnVcOnReceiveCallReply = undefined;
let extFnVcOnMemberJoin = undefined;
let extFnVcOnMemberJoinFailed = undefined;
let extFnVcOnReceiveIceCandidate = undefined;

let extMsgNormalMessage = undefined;
