let chatUserObj;
let chatUserSortedObj;
let chatGroupObj;

function initChatStuff()
{
    const account = currentUser['mainAccount'];

    chatUserObj = loadAccountObjectOrCreateDefault(account, "chatUserList", {});
    logTxt("User List:", chatUserObj);

    chatUserSortedObj = loadAccountObjectOrCreateDefault(account, "chatUserSortedList", []);
    logTxt("User Sorted List:", chatUserSortedObj);

    chatGroupObj = loadAccountObjectOrCreateDefault(account, "chatGroupList", {});
    logTxt("Group List:", chatGroupObj);
}

function getAllUsers()
{
    const account = currentUser['mainAccount'];
    let ids = [];
    for (let id in chatUserObj)
    {
        let val = parseInt(id);
        if (!isNaN(val))
            ids.push(val);
    }
    for (let id of ids)
        userSortedAddEndIfNotExist(account, id);
    for (let id of chatUserSortedObj)
        if (ids.indexOf(id) == -1)
            userSortedRemove(account, id);

    ids = chatUserSortedObj.slice();
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
    saveAccountObject(currentUser['mainAccount'], "chatUserList", chatUserObj);
}

function addGroupIdIfNotExists(groupId)
{
    if (chatGroupObj[groupId] != undefined)
        return;

    chatGroupObj[groupId] = {};
    saveAccountObject(currentUser['mainAccount'], "chatGroupList", chatGroupObj);
}

function removeUserIfExists(userId)
{
    if (chatUserObj[userId] == undefined)
        return;

    delete chatUserObj[userId];
    saveAccountObject(currentUser['mainAccount'], "chatUserList", chatUserObj);
}

function removeGroupIfExists(groupId)
{
    if (chatGroupObj[groupId] == undefined)
        return;

    delete chatGroupObj[groupId];
    saveAccountObject(currentUser['mainAccount'], "chatGroupList", chatGroupObj);
}

function groupExists(groupId)
{
    return chatGroupObj[groupId] != undefined;
}

function userExists(userId)
{
    return chatUserObj[userId] != undefined;
}

function userSortedContains(userId)
{
    return chatUserSortedObj.indexOf(userId) != -1;
}

function userSortedAdd(account, userId)
{
    if (userSortedContains(userId))
        userSortedRemove(account, userId);
    chatUserSortedObj.unshift(userId);
    saveAccountObject(account,"chatUserSortedList", chatUserSortedObj);
}

function userSortedAddEndIfNotExist(account, userId)
{
    if (userSortedContains(userId))
        return;
    chatUserSortedObj = chatUserSortedObj.concat(userId);
    saveAccountObject(account, "chatUserSortedList", chatUserSortedObj);
}

function userSortedRemove(account, userId)
{
    chatUserSortedObj = chatUserSortedObj.filter((id)=>id!=userId);
    saveAccountObject(account, "chatUserSortedList", chatUserSortedObj);
}