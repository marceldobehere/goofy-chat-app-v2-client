async function userGetAllUsers()
{
    let userIds = [];
    for (let userId in userPubKeyDict)
        userIds.push(parseInt(userId));

    // remove listener account user id
    userIds = userIds.filter((userId) => userId != currentUser["listenerAccount"]["userId"]);

    // remove main account user id
    userIds = userIds.filter((userId) => userId != currentUser["mainAccount"]["userId"]);

    // remove redirect accounts
    userIds = userIds.filter((userId) => !currentUser["redirectAccounts"].includes(userId));

    return userIds;
}

async function userSendMessage(userId, data, type)
{
    return sendSecureMessageToUser(currentUser["mainAccount"], userId, data, type, false);
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