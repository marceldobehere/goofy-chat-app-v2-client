async function addFriendUser()
{
    let userId = prompt("Enter user id:");
    if (userId == null)
        return;
    userId = parseInt(userId);
    if (isNaN(userId))
        return alert("Invalid user id");

    logInfo(`Adding user ${userId}`);

    let symmKey = await getUserMySymmKey(currentUser["mainAccount"], userId);
    if (symmKey == null)
    {
        alert("User does not exist!");
        return;
    }

    addUserIdIfNotExists(userId);

    if (docLastServerId == DMsId)
        await createChannelList(DMsId, docLastChannelId, docLastServerId, true);
}