// defines.js

// settings.js

// hover.js



// serverList.js

// channelList.js

// chatList.js

// chatInfo.js

// serverList.js (serverClicked)

// channelList.js (channelClicked)

// chatInput.js

// friends.js

// chatList.js (messageReceivedUI)

// groups.js

// groups.js

// settings.js (settingsUIClicked)

// fileStuff.js




function showId()
{
    let element = document.getElementById('main-chat-selector-settings-userid');
    element.textContent = `${currentUser["mainAccount"]["userId"]}`;
}

async function resetUiList()
{
    createServerList(DMsId);
    await createChannelList(DMsId, undefined, true);
    await createChatList(DMsId, NoId);
}

async function doConnInit() {
    //tryExtFn(extMsgNormalMessage, account, chatUserId, message);
    extMsgNormalMessage = messageReceivedUI;
    extGroupJoined = groupJoinedUI;
    extGroupLeft = groupLeftUI;
    extGroupInfoUpdate = groupUpdateUI;


    showId();
    await resetUiList();
}

function copyUserId()
{
    let element = document.getElementById('main-chat-selector-settings-userid');
    navigator.clipboard.writeText(element.textContent).then();
}