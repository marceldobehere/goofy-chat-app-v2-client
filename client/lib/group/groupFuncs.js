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

async function addChannelToGroup(account, groupId, channelName)
{
    let info = getGroupChatInfo(account, groupId);
    if (info === undefined)
    {
        logError("Group not found");
        return;
    }

    let channels = info["channels"];
    let id = getRandomIntInclusive(0, 99999999999);
    channels.push({id: id, name: channelName});
    setGroupChatInfo(account, groupId, info);

    await sendNewGroupChatInfoToAll(account, groupId);
}

async function removeChannelFromGroup(account, groupId, channelId)
{
    let info = getGroupChatInfo(account, groupId);
    if (info === undefined)
    {
        logError("Group not found");
        return;
    }

    let channels = info["channels"];
    let index = channels.findIndex(x => x["id"] === channelId);
    if (index === -1)
    {
        logError("Channel not found");
        return;
    }

    channels.splice(index, 1);
    setGroupChatInfo(account, groupId, info);

    await sendNewGroupChatInfoToAll(account, groupId);
}

async function updateChannelFromGroup(account, groupId, channelId, newChannelName)
{
    let info = getGroupChatInfo(account, groupId);
    if (info === undefined)
    {
        logError("Group not found");
        return;
    }

    let channels = info["channels"];
    let index = channels.findIndex(x => x["id"] === channelId);
    if (index === -1)
    {
        logError("Channel not found");
        return;
    }

    channels[index]["name"] = newChannelName;
    setGroupChatInfo(account, groupId, info);

    await sendNewGroupChatInfoToAll(account, groupId);
}

async function addUserToGroup(account, groupId, userId)
{
    let info = getGroupChatInfo(account, groupId);
    if (info === undefined)
    {
        logError("Group not found");
        return;
    }

    let members = info["members"];
    if (members.includes(userId))
    {
        logWarn("User already in group");
        return;
    }

    members.push(userId);
    setGroupChatInfo(account, groupId, info);

    await sendNewGroupChatInfoToAll(account, groupId);

    await internal_sendUserGroupJoinInvite(account, groupId, userId);
}

async function removeUserFromGroup(account, groupId, userId)
{
    let info = getGroupChatInfo(account, groupId);
    if (info === undefined)
    {
        logError("Group not found");
        return;
    }

    let members = info["members"];
    let index = members.findIndex(x => x === userId);
    if (index === -1)
    {
        logError("User not found");
        return;
    }

    members.splice(index, 1);
    setGroupChatInfo(account, groupId, info);

    await sendNewGroupChatInfoToAll(account, groupId);

    await internal_sendUserGroupLeaveInvite(account, groupId, userId);
}

async function leaveGroup(account, groupId)
{
    logError("Group leave not implemented yet.");

    // find group

    // Check if I am not the sole admin
    // if yes, send normal group leave message and remove group
    // if no, delete group -> send group kick/delete message to everyone and then leave
}



async function internal_sendUserGroupJoinInvite(account, groupId, userId)
{
    let info = getGroupChatInfo(account, groupId);
    if (info === undefined)
    {
        logError("Group not found");
        return;
    }

    let msg = {
        groupInfo: getGroupChatInfoToSend(info)
    };


    await sendSecureMessageToUser(account, userId, msg, "group-chat-join-invite", false, true);
}

async function internal_sendUserGroupLeaveInvite(account, groupId, userId)
{
    let info = getGroupChatInfo(account, groupId);
    if (info === undefined)
    {
        logError("Group not found");
        return;
    }

    let msg = {
        groupId: groupId
    };

    await sendSecureMessageToUser(account, userId, msg, "group-chat-kick", false, true);
}
