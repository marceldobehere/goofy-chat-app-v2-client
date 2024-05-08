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
    if (!hasGroupChatInfo(currentUser['mainAccount'], groupId))
    {
        logError("Group not found");
        return;
    }
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

async function addChannelToGroup(user, groupId, channelName)
{
    let account = user['mainAccount'];
    if (!hasGroupChatInfo(account, groupId))
    {
        logError("Group not found");
        return;
    }
    let info = getGroupChatInfo(account, groupId);

    if (!info["admins"].includes(account["userId"]))
    {
        logError("User not admin");
        return;
    }

    let channels = info["channels"];
    let id = getRandomIntInclusive(0, 99999999999);
    channels.push({id: id, name: channelName});
    setGroupChatInfo(account, groupId, info);

    await sendNewGroupChatInfoToAll(user, groupId);
}

async function removeChannelFromGroup(user, groupId, channelId)
{
    let account = user['mainAccount'];

    if (!hasGroupChatInfo(account, groupId))
    {
        logError("Group not found");
        return;
    }
    let info = getGroupChatInfo(account, groupId);

    if (!info["admins"].includes(account["userId"]))
    {
        logError("User not admin");
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

    await sendNewGroupChatInfoToAll(user, groupId);
}

async function updateChannelFromGroup(user, groupId, channelId, newChannelName)
{
    let account = user['mainAccount'];

    if (!hasGroupChatInfo(account, groupId))
    {
        logError("Group not found");
        return "Group not found";
    }
    let info = getGroupChatInfo(account, groupId);

    if (!info["admins"].includes(account["userId"]))
    {
        logError("User not admin");
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

    await sendNewGroupChatInfoToAll(user, groupId);
}

async function addUserToGroup(user, groupId, userId)
{
    let account = user['mainAccount'];

    if (!hasGroupChatInfo(account, groupId))
        return "Group not found";
    let info = getGroupChatInfo(account, groupId);

    if (!info["admins"].includes(account["userId"]))
        return "User not admin";

    let members = info["members"];
    if (members.includes(userId))
        return "User already in group";

    members.push(userId);
    setGroupChatInfo(account, groupId, info);

    await internal_sendUserGroupJoinInvite(account, groupId, userId);

    await sendNewGroupChatInfoToAll(user, groupId);

    return true;
}

async function removeUserFromGroup(user, groupId, userId)
{
    let account = user['mainAccount'];

    if (!hasGroupChatInfo(account, groupId))
        return "Group not found";
    let info = getGroupChatInfo(account, groupId);

    if (!info["admins"].includes(account["userId"]))
        return "User not admin";

    let members = info["members"];
    let index = members.findIndex(x => x === userId);
    if (index === -1)
        return "User not in group";

    members.splice(index, 1);
    setGroupChatInfo(account, groupId, info);

    await internal_sendUserGroupKick(account, groupId, userId);

    await sendNewGroupChatInfoToAll(user, groupId);

    return true;
}


async function leaveGroup(user, groupId)
{
    logError("Group leave not implemented yet.");

    if (!hasGroupChatInfo(user['mainAccount'], groupId))
        return "Group not found";
    let info = getGroupChatInfo(user['mainAccount'], groupId);

    if (info["members"].length === 1)
    {
        logWarn("Last member in group. Deleting group.");
        deleteGroupLocally(user["mainAccount"], groupId);

        await extGroupLeft(groupId, info["groupName"]);
        return true;
    }

    if (info["admins"].length === 1 && info["admins"][0] === user["mainAccount"]["userId"])
    {
        logWarn("Last admin in group. Deleting group.");

        let members = info["members"];
        for (let member of members)
            await removeUserFromGroup(user, groupId, member);

        deleteGroupLocally(user['mainAccount'], groupId);

        await extGroupLeft(groupId, info["groupName"]);
        return true;
    }

    await internal_sendUserGroupLeave(user['mainAccount'], groupId);

    deleteGroupLocally(user['mainAccount'], groupId);

    await extGroupLeft(groupId, info["groupName"]);

    return true;
}



async function internal_sendUserGroupJoinInvite(account, groupId, userId)
{
    if (!hasGroupChatInfo(account, groupId))
    {
        logError("Group not found");
        return;
    }
    let info = getGroupChatInfo(account, groupId);

    let msg = {
        groupInfo: getGroupChatInfoToSend(info)
    };


    await sendSecureMessageToUser(account, userId, msg, "group-chat-join-invite", false, true);
}

async function internal_sendUserGroupKick(account, groupId, userId)
{
    if (!hasGroupChatInfo(account, groupId))
    {
        logError("Group not found");
        return;
    }
    let info = getGroupChatInfo(account, groupId);


    let msg = {
        groupId: groupId
    };

    await sendSecureMessageToUser(account, userId, msg, "group-chat-kick", false, true);
}

async function internal_sendUserGroupLeave(account, groupId)
{
    if (!hasGroupChatInfo(account, groupId))
    {
        logError("Group not found");
        return;
    }
    let info = getGroupChatInfo(account, groupId);


    let msg = {
        groupId: groupId,

    };

    // send to all members
    let members = info["members"];
    for (let member of members)
        await sendSecureMessageToUser(account, member, msg, "group-chat-leave", false, true);
}