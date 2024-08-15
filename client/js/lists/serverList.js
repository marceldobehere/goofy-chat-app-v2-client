const docServerList = document.getElementById("main-sidebar-list");
let docLastServerEntry = null;
let docLastServerId = NoId;

function createServerEntry(imgSrc, serverId, serverName, shouldHighlight) {
    let li = document.createElement("li");
    let img = document.createElement("img");
    img.src = imgSrc;
    img.className = "sidebar-entry";
    img.onmouseover = () => {
        serverHoverStart(img, serverName)
    };
    img.alt = `Group: ${serverName}`;
    img.onmouseleave = serverHoverEnd;
    img.onclick = async () => {
        await serverClicked(img, serverId)
    };
    img.loading = "lazy";

    if (shouldHighlight)
    {
        img.classList.add("sidebar-entry-active");
        docLastServerEntry = img;
        docLastServerId = serverId;
    }

    li.appendChild(img);
    docServerList.appendChild(li);
}

function createServerList(selectedServerId) {
    docServerList.innerHTML = "";
    docLastServerEntry = null;
    docLastServerId = NoId;

    createServerEntry("./assets/imgs/dm.png", DMsId, `DMs`, selectedServerId == DMsId);

    let groups = getAllGroups();
    for (let i = 0; i < groups.length; i++)
    {
        if (!hasGroupChatInfo(currentUser["mainAccount"], groups[i]))
            continue;
        let info = getGroupChatInfo(currentUser['mainAccount'], groups[i]);
        createServerEntry("./assets/imgs/uh.png", groups[i], info["groupName"], selectedServerId == groups[i]);
    }
}

async function serverClicked(element, serverId) {
    console.log(`Server ${serverId} clicked`);
    if (docLastServerEntry)
        docLastServerEntry.classList.remove("sidebar-entry-active");
    element.classList.add("sidebar-entry-active");


    if (settingsObj["chat"]["auto-show-chat"])
    {
        if (serverId == docLastServerId)
        {
            if (getChannelInfoVis())
                setChannelInfoVisibility(false);
            else
                setChannelInfoVisibility(true);
        }
        else
            setChannelInfoVisibility(true);
    }
    else
        setChannelInfoVisibility(true);

    docLastServerEntry = element;
    docLastServerId = serverId;

    if (serverId == docChatLastServerId)
        await createChannelList(serverId, docChatLastChannelId);
    else
        await createChannelList(serverId);
}