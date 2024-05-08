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

async function handleGroupInvite(account, msgObj)
{
    logInfo("Group Invite: ", msgObj);
    let groupInfo = tryConformGroupChatInfo(msgObj["data"]["groupInfo"]);
    logInfo("Group Info: ", groupInfo);

    let from = msgObj["from"];
    if (!groupInfo["admins"].includes(from))
    {
        logError("User not admin");
        return;
    }

    if (!groupInfo["members"].includes(from))
    {
        logError("User not in group");
        return;
    }

    let groupId = groupInfo["groupId"];
    if (hasGroupChatInfo(account, groupId))
    {
        logError("Group already exists");
        return;
    }
    let groupName = groupInfo["groupName"];

    setGroupChatInfo(account, groupId, groupInfo);

    addGroupIdIfNotExists(groupId);

    await tryExtAsyncFn(extGroupJoined, groupId, groupName);
}

async function handleGroupKick(account, msgObj)
{
    console.log("Group Kick: ", msgObj);
    let groupId = msgObj["data"]["groupId"];

    let info = getGroupChatInfo(account, groupId);
    if (info === undefined)
    {
        logError("Group not found");
        return;
    }

    let from = msgObj["from"];
    if (!info["admins"].includes(from))
    {
        logError("User not admin");
        return;
    }
    let groupName = info["groupName"];

    deleteGroupChatInfo(account, groupId, groupName);

    removeGroupIfExists(groupId);



    logWarn("Need to delete all saved group channels and stuff");

    await tryExtAsyncFn(extGroupLeft, groupId, groupName);
}





let extGroupJoined = undefined;
let extGroupLeft = undefined;
let extGroupInfoUpdate = undefined;
