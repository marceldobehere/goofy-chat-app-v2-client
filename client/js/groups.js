async function createGroup()
{
    alert("GROUP ADD");

    let groupName = prompt("Enter Group name");
    if (groupName == null)
        return;
    let groupId = getRandomIntInclusive(0, 99999999999);

    let channels = [];
    while (true)
    {
        let channel = prompt("Enter channel name");
        if (channel == null || channel == "")
            break;

        let channelExists = !!channels.find((x) => x.name == channel);
        if (channelExists)
        {
            alert("Channel already exists");
            continue;
        }

        let channelId = getRandomIntInclusive(0, 99999999999);
        channels.push({id: channelId, name: channel});
    }

    if (channels.length == 0)
        return;

    await accCreateGroupChat(currentUser['mainAccount'], groupId, groupName, channels);

    await createServerList(docLastServerId);
}

async function groupJoinedUI()
{
    await createServerList(docLastServerId);
}

async function groupLeftUI(groupId, groupName)
{
    if (docLastServerId == groupId)
    {
        logInfo("SERVER WAS SELECTED")
        docLastServerId = NoId;
        docLastChannelServerId = NoId;
        docLastChannelId = NoId;

        // docChatLastServerId = NoId;
        // docChatLastChannelId = NoId;
        await createChannelList(docChatLastServerId, docLastChannelId, true);
    }
    await createServerList(docLastServerId);

    if (docChatLastServerId == groupId)
    {
        logInfo("WAS IN CHANNEL")
        docChatLastServerId = NoId;
        docChatLastChannelId = NoId;
        await createChannelList(docChatLastServerId, docLastChannelId, true);
        await createChatList(docChatLastServerId, docChatLastChannelId, true);
    }

    alert(`You left group ${groupName}`);
}

async function groupUpdateUI(groupId, groupInfo)
{
    await createServerList(docLastServerId);
    logInfo(`Group Update: ${groupId} -> `, groupInfo)

    if (docLastServerId == groupId)
        await createChannelList(docLastServerId, docLastChannelId, true);

    if (docChatLastServerId == groupId)
    {
        let channels = groupInfo["channels"];
        if (channels.findIndex(x => x["id"] === docChatLastChannelId) == -1)
        {
            docChatLastServerId = NoId;
            docChatLastChannelId = NoId;
            await createChatList(docChatLastServerId, docChatLastChannelId, true);
        }
        await refreshChatListArea(docChatLastServerId, docChatLastChannelId);
    }
}