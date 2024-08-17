const fileStatList = document.getElementById('main-chat-content-input-file-status');
let currSendFileList = [];


async function setFileStatListVisibility(visible) {
    rootElement.style.setProperty("--main-chat-show-input-file-status", visible ? "1" : "0");
}


async function clearFileStatList() {
    currSendFileList = [];
    fileStatList.innerHTML = "";
}

async function hideFileStatListIfEmpty() {
    if (currSendFileList.length == 0)
        await setFileStatListVisibility(false);
}

async function clearAndHideFileStatList() {
    await clearFileStatList();
    await setFileStatListVisibility(false);
}

async function addFileStatListEntry(file) {
    await lockFileAdd.enable();
    try {
        console.log(`Adding file to send list: `, file);
        currSendFileList.push(file);
        await displayNewFileStatListEntry(file);
        await setFileStatListVisibility(true);
    } catch (e) {
        console.error(e);
    }
    await lockFileAdd.disable();
}

// Create a div that contains the file name and a cancel button
async function displayNewFileStatListEntry(file) {
    let div = document.createElement("div");
    div.className = "file-stat-entry";

    let text = document.createElement("p");
    text.textContent = `${file.name} (${dynamicSizeDisplay(file.size)})`;
    text.onclick = async () => {
        console.log(`Clicked on file: `, file)
        if (!file)
            return alert(`[Error: File not found]`);
        let fileData = await file.arrayBuffer();

        let blob = new Blob([fileData]);//, {type: "image/png"});
        let url = URL.createObjectURL(blob);

        let newBlob = undefined;
        if (await doesImageExist(url))
            newBlob = new Blob([fileData], {type: "image/png"});
        // else if (await doesVideoExist(url))
        //     newBlob = new Blob([fileData], {type: "video/mp4"});
        // else if (await doesAudioExist(url))
        //     newBlob = new Blob([fileData], {type: "audio/mpeg"});

        if (newBlob) {
            let newUrl = URL.createObjectURL(newBlob);
            let newTab = window.open(newUrl, "_blank");
            newTab.focus();
        }
    };
    div.appendChild(text);

    let btn = document.createElement("button");
    btn.textContent = "X";
    btn.className = "file-stat-entry-cancel";
    btn.onclick = async () => {
        if (lockFileAdd.isLocked())
            return;

        console.log(`Cancelling file: `, file);
        // check if file is in list
        if (!currSendFileList.includes(file))
            return;

        // remove div from list
        div.remove();
        // remove file from list
        currSendFileList = currSendFileList.filter(x => x != file);
        // hide list if empty
        await hideFileStatListIfEmpty();

        docChatInputElement.focus();
    };
    div.appendChild(btn);

    fileStatList.appendChild(div);
}

function confirmSendFiles()
{
    if (currSendFileList.length == 0)
        return true;
    if (!confirm(`Send ${currSendFileList.length} file(s) to the chat?`))
        return false;
    return true;
}

async function trySendFiles()
{
    if (currSendFileList.length == 0)
        return;

    await lockFileAdd.enable();
    try {
        let fileList = currSendFileList;
        let fileDivList = Array.from(fileStatList.children);
        currSendFileList = [];

        // remove the X buttons
        for (let div of fileDivList)
            div.children[1].remove();

        // send all files
        let fileIndex = 0;
        for (let file of fileList)
        {
            try {
                console.log(`> Sending file: `, file);
                let tempIndex = fileIndex;
                let div = fileDivList[tempIndex];
                await trySendFile(file, (fileId, bytesSent, totalBytes, chunkIndex, chunkCount) => {
                    if (!div)
                        return;
                    let text = div.children[0];
                    if (bytesSent == totalBytes) {
                        try {div.remove();} catch (e) {}
                    }
                    else
                        text.textContent = `${file.name} (${dynamicSizeDisplay(bytesSent)}/${dynamicSizeDisplay(totalBytes)} - ${Math.floor(bytesSent / totalBytes * 100)}%)`;
                });
                try {div.remove();} catch (e) {}
            } catch (e) {
                console.error(`Error sending file: `, e);
            }
            fileIndex++;
        }

        await clearAndHideFileStatList();
    } catch (e) {
        console.error(e);
    }
    await lockFileAdd.disable();
}