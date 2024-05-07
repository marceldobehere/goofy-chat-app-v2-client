let chatUserObj;
let chatGroupObj;

function initChatStuff()
{
    chatUserObj = loadObjectOrCreateDefault("chatUserList", {});
    saveObject("chatUserList", chatUserObj);
    logTxt("User List:", chatUserObj);

    chatGroupObj = loadObjectOrCreateDefault("chatGroupList", {});
    saveObject("chatGroupList", chatGroupObj);
    logTxt("Group List:", chatGroupObj);
}

function getAllUsers()
{
    let ids = [];
    for (let id in chatUserObj)
        ids.push(parseInt(id));
    return ids;
}

function getAllGroups()
{
    let ids = [];
    for (let id in chatGroupObj)
        ids.push(parseInt(id));
    return ids;
}
//
// function getUserInfo(userId)
// {
//     return chatUserObj[userId];
// }
//
// function setUserInfo(userId, info)
// {
//     chatUserObj[userId] = info;
//     saveObject("chatUserList", chatUserObj);
// }
//
// function getGroupInfo(groupId)
// {
//     return chatGroupObj[groupId];
// }

// function setGroupInfo(groupId, info)
// {
//     chatGroupObj[groupId] = info;
//     saveObject("chatGroupList", chatGroupObj);
// }

function addUserIdIfNotExists(userId)
{
    if (chatUserObj[userId] != undefined)
        return;

    chatUserObj[userId] = {};
    saveObject("chatUserList", chatUserObj);
}

function addGroupIdIfNotExists(groupId)
{
    if (chatGroupObj[groupId] != undefined)
        return;

    chatGroupObj[groupId] = {};
    saveObject("chatGroupList", chatGroupObj);
}

function removeUserIfExists(userId)
{
    if (chatUserObj[userId] == undefined)
        return;

    delete chatUserObj[userId];
    saveObject("chatUserList", chatUserObj);
}

function removeGroupIfExists(groupId)
{
    if (chatGroupObj[groupId] == undefined)
        return;

    delete chatGroupObj[groupId];
    saveObject("chatGroupList", chatGroupObj);
}

function groupExists(groupId)
{
    return chatGroupObj[groupId] != undefined;
}

function userExists(userId)
{
    return chatUserObj[userId] != undefined;
}