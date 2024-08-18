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