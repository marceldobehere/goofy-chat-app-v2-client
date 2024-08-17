const docChatInputElement = document.getElementById("main-chat-content-input-input-textarea");
let messageSending = 0;

function mainChatInputKey(event)
{
    let key = event.keyCode;
    let shift = event.shiftKey;
    if (key == 13 && !shift)
    {
        setTimeout(messageSend, 0);
        return event.preventDefault();
    }
    if (event.key == "Escape")
    {
        clearAndHideFileStatList().then();
        return event.preventDefault();

    }
}

function getCurrentChatUserId()
{
    if (docChatLastServerId == DMsId)
        return docChatLastChannelId;
    else
        return getChannelStrFromGroup(docChatLastServerId, docChatLastChannelId);
}

async function doMsgSendThingy(type, data, dontAdd)
{
    console.log(`Sending message: ${JSON.stringify(data)} (Type: ${type})`);

    if (docChatLastServerId == DMsId)
    {
        let userId = docChatLastChannelId;
        let res = await userSendDirectMessageSpecial(userId, data, type, !!dontAdd);
        console.log(res);
    }
    else
    {
        //alert('Group chats not implemented yet');
        let res = await userSendGroupMessageSpecial(docChatLastServerId, docChatLastChannelId, data, type, !!dontAdd);
        console.log(res);
    }
}


async function messageSend() {
    if (docChatLastServerId == NoId || docChatLastChannelId == NoId)
        return;

    if (messageSending > 0)
    {
        messageSending++;
        if (messageSending > 20) {
            messageSending = 0;
            console.log("SEND MSG ANYWAY");

            resetMsgLocks();
        }
        setTimeout(messageSend, 500);
        return;
    }
    messageSending++;

    if (!confirmSendFiles())
    {
        messageSending = 0;
        return;
    }

    let text = docChatInputElement.value;
    docChatInputElement.value = "";

    try
    {
        if (text != "")
            await doMsgSendThingy("text", text);
    }
    catch (e)
    {
        console.error(e);
    }

    try {
        trySendFiles().then();
    } catch (e) {
        console.error(e);
    }

    // if (docChatLastServerId == DMsId)
    //     await createChatList(docChatLastServerId, docChatLastChannelId, true);

    messageSending = 0;
}

