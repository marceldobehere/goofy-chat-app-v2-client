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
        members: [],
        channels: groupChannels
    });
}



async function userSendGroupMessage(groupId, channelId, data, type)
{
    addGroupIdIfNotExists(groupId);
    logWarn("Group messages are not implemented yet.");
}

async function userDeleteGroupMessages(groupId, channelId)
{
    await internalRemoveUserMessages(currentUser["mainAccount"], `G_${groupId}_${channelId}`);
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
    return await internalGetUserMessages(currentUser["mainAccount"], `G_${groupId}_${channelId}`);
}

async function userGetGroupUnreadMessages(groupId, channelId)
{
    return await getUnreadMessages(currentUser["mainAccount"], `G_${groupId}_${channelId}`);
}

async function userMarkGroupMessagesAsRead(groupId, channelId)
{
    // await readMessages(currentUser["mainAccount"], userId);
    //
    // // send read-message to redirects
    // let msg = {
    //     messageId: getRandomIntInclusive(0, 99999999999),
    //     data: {userId: userId},
    //     type: "read-message"
    // };
    //
    // let accountFrom = currentUser["mainAccount"];
    //
    // msg["date"] = new Date();
    // msg["from"] = accountFrom["userId"];
    //
    // await addSentMessage(accountFrom, userId, msg, true);
}






