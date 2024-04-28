const hoverElement = document.getElementById("goofy-server-popup");

function serverHoverStart(element, serverName) {
    hoverElement.style.display = "block";
    let rect1 = element.getBoundingClientRect();
    let rect2 = hoverElement.getBoundingClientRect();

    hoverElement.style.left = rect1.x + rect1.width + 10 + "px";
    let y = rect1.y + (rect1.height - rect2.height) / 2;
    hoverElement.style.top = y + "px";
    hoverElement.textContent = serverName;
}

function serverHoverEnd() {
    hoverElement.style.display = "none";
}

const docServerList = document.getElementById("main-sidebar-list");
let docLastServerEntry = null;
// also sidebar-entry-active
// <li><img src="./assets/imgs/dm.png" class="sidebar-entry" onmouseover="serverHoverStart(this, 'A')" onmouseleave="serverHoverEnd()"></li>
function createServerEntry(imgSrc, serverId, serverName) {
    let li = document.createElement("li");
    let img = document.createElement("img");
    img.src = imgSrc;
    img.className = "sidebar-entry";
    img.onmouseover = () => {serverHoverStart(img, serverName)};
    img.onmouseleave = serverHoverEnd;
    img.onclick = () => {serverClicked(img, serverId)};
    li.appendChild(img);
    docServerList.appendChild(li);
}

function createServerList() {
    docServerList.innerHTML = "";
    docLastServerEntry = null;

    createServerEntry("./assets/imgs/dm.png", -1, `DMs`);
    for (let i = 0; i < 10; i++)
        createServerEntry("./assets/imgs/uh.png", i, `S: ${i}`);
}


const docChannelList = document.getElementById("main-chat-selector-list");
let docLastChannelEntry = null;
// also chat-selector-entry-active
// <li><span class="chat-selector-entry">CHAT 1</span></li>
function createChannelEntry(channelId, channelName) {
    let li = document.createElement("li");
    let span = document.createElement("span");
    span.className = "chat-selector-entry";
    span.textContent = channelName;
    span.onclick = () => {channelClicked(span, channelId)};
    li.appendChild(span);
    docChannelList.appendChild(li);
}

function createChannelList() {
    docChannelList.innerHTML = "";
    docLastChannelEntry = null;

    createChannelEntry(0, "General");
    for (let i = 0; i < 10; i++)
        createChannelEntry(i, `Channel ${i}`);
}

function serverClicked(element, serverId)
{
    console.log(`Server ${serverId} clicked`);
    if (docLastServerEntry)
        docLastServerEntry.classList.remove("sidebar-entry-active");
    element.classList.add("sidebar-entry-active");
    docLastServerEntry = element;
}

function channelClicked(element, channelId)
{
    console.log(`Channel ${channelId} clicked`);
    if (docLastChannelEntry)
        docLastChannelEntry.classList.remove("chat-selector-entry-active");
    element.classList.add("chat-selector-entry-active");
    docLastChannelEntry = element;
}

async function doConnInit() {
    createServerList();

    createChannelList();
}

doConnInit().then();