async function accCreateGroupChat(account, groupId, groupName, groupChannels)
{
    logInfo("Creating group chat...");
    logInfo(" > Group ID: ", groupId);
    logInfo(" > Group Name: ", groupName);
    logInfo(" > Group Channels: ", groupChannels);

    if (groupExists(groupId))
    {
        logWarn("Group already exists.");
        return;
    }

    addGroupIdIfNotExists(groupId);

    setGroupChatInfo(account, groupId, {
        groupName: groupName,
        groupId: groupId,
        members: [account["userId"]],
        admins: [account["userId"]],
        channels: groupChannels
    });
}

function getChannelStrFromGroup(groupId, channelId)
{
    return `G_${groupId}_${channelId}`;
}

function isStrChannelFromGroup(str)
{
    return str.toString().startsWith("G_");
}

function getGroupAndChannelFromChannelStr(str)
{
    let parts = str.toString().split("_");
    if (parts.length !== 3)
        return undefined;
    return {groupId: parts[1], channelId: parts[2]};
}


function createGroupChatMessage(groupId, channelId, data, type)
{
    let subMsg = {
        groupId: groupId,
        channelId: channelId,
        data: data,
        type: type,
        messageId: getRandomIntInclusive(0, 99999999999),
        date: new Date()
    };
    let sign = createSignature(subMsg, currentUser["mainAccount"]["private-key"]);

    let msg = {
        messageId: getRandomIntInclusive(0, 99999999999),
        type: "group-chat-msg",
        data: {
            msg: subMsg,
            from: currentUser["mainAccount"]["userId"],
            sign: sign
        }
    };

    return msg;
}


async function userSendGroupMessage(groupId, channelId, data, type)
{
    addGroupIdIfNotExists(groupId);
    logWarn("Group messages are not implemented yet.");

    let msg = createGroupChatMessage(groupId, channelId, data, type);
    logInfo("SEND GROUP MSG", msg);

    await sendGroupChatMessageToAll(currentUser, groupId, msg);

    await handleGroupMessage(currentUser["mainAccount"], msg["data"]);
}

async function userDeleteGroupMessages(groupId, channelId)
{
    await internalRemoveUserMessages(currentUser["mainAccount"], getChannelStrFromGroup(groupId, channelId));
}


async function userGetGroupMessageInfo(groupId)
{
    return undefined;
}

async function userSetGroupMessageInfo(groupId, obj)
{
    alert("Group messages are not implemented yet.");
}

async function userGetGroupMessages(groupId, channelId)
{
    return await internalGetUserMessages(currentUser["mainAccount"], getChannelStrFromGroup(groupId, channelId));
}

async function userGetGroupUnreadMessages(groupId, channelId)
{
    return await getUnreadMessages(currentUser["mainAccount"], getChannelStrFromGroup(groupId, channelId));
}

async function userMarkGroupMessagesAsRead(groupId, channelId)
{
    await readMessages(currentUser["mainAccount"], getChannelStrFromGroup(groupId, channelId));

    // send read-message to redirects
    let msg = {
        messageId: getRandomIntInclusive(0, 99999999999),
        data: {userId: getChannelStrFromGroup(groupId, channelId)},
        type: "read-message"
    };

    let accountFrom = currentUser["mainAccount"];

    msg["date"] = new Date();
    msg["from"] = accountFrom["userId"];

    await addSentMessage(accountFrom, getChannelStrFromGroup(groupId, channelId), msg, true);
}





async function handleGroupMessage(account, msgObj)
{
    logInfo("Group Message: ", msgObj);
    let from = msgObj["from"];
    let sign = msgObj["sign"];
    let msg = msgObj["msg"];

    let pubKey = await getPublicKeyFromUser(from);
    if (pubKey === undefined)
    {
        logError("User not found on server");
        return;
    }

    if (!verifySignature(msg, sign, pubKey))
    {
        logError("Invalid signature from", from);
        return;
    }

    let groupId = msg["groupId"];
    let channelId = msg["channelId"];
    let data = msg["data"];
    let type = msg["type"];
    let date = msg["date"];
    let messageId = msg["messageId"];

    let info = getGroupChatInfo(account, groupId);
    console.log(info);
    if (info === undefined)
    {
        logError("Group not found");
        return;
    }

    if (!info["members"].includes(from))
    {
        logError("User not in group");
        return;
    }

    if (!info["channels"].find(x => x["id"] === channelId))
    {
        logError("Channel not in group");
        return;
    }

    let sendMsgObj = {
        messageId: messageId,
        data: data,
        type: type,
        date: date,
        from: from
    };

    await addMessageToUser(account, from, getChannelStrFromGroup(groupId, channelId), sendMsgObj, date);

    logWarn("Group messages not fully implemented yet");
}


async function sendGroupChatMessageToAll(user, groupId, msg)
{
    // send the message to all people
    logInfo("Sending new user chat info to all people.");

    let info = getGroupChatInfo(currentUser['mainAccount'], groupId);

    let users = info["members"];
    for (let userId of users)
        if (userId != user['listenerAccount']["userId"])
            await sendGroupChatMessageToOne(user['mainAccount'], userId, msg);

    // send the message to all redirects
    let redirects = user["redirectAccounts"];
    for (let userId of redirects)
        await sendGroupChatMessageToOne(user['mainAccount'], userId, msg);
}

async function sendGroupChatMessageToOne(account, userId, msg)
{
    // send the new account info to one person
    logInfo(`Sending message to ${userId}.`);

    let type = msg["type"]
    let data = msg["data"];
    await sendSecureMessageToUser(account, userId, data, type, false, true);
}
