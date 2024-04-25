async function userSendDirectMessage(userId, data, type)
{
    addUserIdIfNotExists(userId);
    return sendSecureMessageToUser(currentUser["mainAccount"], userId, data, type, false);
}

async function userSendGroupMessage(groupId, data, type)
{
    addGroupIdIfNotExists(groupId);
    logWarn("Group messages are not implemented yet.");
}

async function userGetMessages(userId)
{
    return await internalGetUserMessages(currentUser["mainAccount"], userId);
}

async function userGetUnreadMessages(userId)
{
    return await getUnreadMessages(currentUser["mainAccount"], userId);
}

async function userMarkMessagesAsRead(userId)
{
    await readMessages(currentUser["mainAccount"], userId);

    // send read-message to redirects
    let msg = {
        messageId: getRandomIntInclusive(0, 99999999999),
        data: {userId: userId},
        type: "read-message"
    };

    let accountFrom = currentUser["mainAccount"];

    msg["date"] = new Date();
    msg["from"] = accountFrom["userId"];

    await addSentMessage(accountFrom, userId, msg, true);
}