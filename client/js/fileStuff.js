const fileListUl = document.getElementById("settings-file-list-ul");
const fileListDiv = document.getElementById("settings-file-list-div");
const fileLoadBtn = document.getElementById("settings-file-list-load-btn");

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});

// https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string
function _arrayBufferToBase64(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function trySendFile(file) {
    if (!file)
        return;
    if (file.size == 0)
        return;

    const chunkSize = 150 * 1024;

    console.log(`> File \"${file.name}\" (${file.size} bytes)`);
    let fileId = getRandomIntInclusive(100000000, 99999999999);
    let fileObj = {filename: file.name, filesize: file.size, chunkSize: chunkSize, fileId: fileId};

    // Read the file in chunks and send them
    let reader = new FileReader();
    let chunkIndex = 0;
    let chunkCount = Math.ceil(file.size / chunkSize);

    // Upload chunks
    // let promiseArr = [];
    while (chunkIndex < chunkCount) {
        //console.log(`  > Uploading... ${Math.round((10000*chunkIndex) / chunkCount) / 100}%`);
        let start = chunkIndex * chunkSize;
        let end = Math.min(start + chunkSize, file.size);
        let data = file.slice(start, end);
        let chunkData;
        try {
            chunkData = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(data);
            });
        } catch (e) {
            // element.textContent = "Error: " + e;
            // lockUpload.disable();
            console.error(e);
            return {error: e};
        }
        //console.log(`  > Chunk ${chunkIndex}: ${end}/${file.size} -> ${chunkData.byteLength} bytes`);
        let compressed = await compressBuffer(chunkData);
        let chunkStr = _arrayBufferToBase64(compressed);
        //console.log(`${chunkData.byteLength} -> ${compressed.byteLength} -> ${chunkStr.length}`);

        let sendMsg = {file: fileObj, chunkIndex: chunkIndex, data: chunkStr};


        let p1 = doMsgSendThingy("file-msg", sendMsg, true);
        //promiseArr.push(p1);
        await p1;

        let p2 = handleFilePartMsg(currentUser['mainAccount'], getCurrentChatUserId(), {data: sendMsg});
        //promiseArr.push(p2);
        await p2;

        //await new Promise(r => setTimeout(r, 100));
        chunkIndex++;
    }
    // await Promise.all(promiseArr);

    await doMsgSendThingy("text", `![${file.name}](${filePathStart + fileId})`);
    console.log(" > Done.")
}


async function filePastedInTextArea(event) {
    const dT = event.clipboardData || window.clipboardData;
    const files = dT.files;

    for (let file of files) {
        console.log(`> Sending file: `, file);
        await trySendFile(file);
    }
}


async function loadFileList(account) {
    fileListUl.innerHTML = "";
    fileLoadBtn.textContent = "Loading...";
    fileLoadBtn.disabled = true;

    try {
        let userIds = getAllUsers().concat(getAllGroupChannelIds(account));
        let filePromises = [];
        for (let userId of userIds)
            filePromises.push(internalGetRawFiles(account, userId));

        for (let filePromise of filePromises) {
            let files = await filePromise;
            if (!files)
                continue;

            for (let file of files)
            {
                let li = document.createElement("li");
                let a = document.createElement("a");
                let downloadBtn = document.createElement("button");
                let deleteBtn = document.createElement("button");

                let fileId = file["fileId"];
                let fileName = file["info"]["filename"];
                let fileSize = file["info"]["fileSize"];
                let userId = file["userId"];

                a.textContent = `[${fileName}] (${Math.floor(fileSize / 1024)} KB) (${userId})`;
                a.onclick = async () => {
                    console.log(`Clicked on file: ${fileId}`);
                    let file = await internalGetFile(account, userId, fileId);
                    if (!file)
                        return alert(`[Error: File not found]`);
                    let fileData = file["data"]; // is a uint8array

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

                downloadBtn.textContent = "Download";
                downloadBtn.onclick = async() => {
                    console.log(`Download file: ${fileId}`);

                    let file = await internalGetFile(account, userId, fileId);
                    if (!file)
                        return alert(`[Error: File not found]`);
                    let fileData = file["data"]; // is a uint8array
                    let filename = file["filename"];
                    let blob = new Blob([fileData]);
                    let url = URL.createObjectURL(blob);

                    let a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.click();
                };

                deleteBtn.textContent = "Delete";
                deleteBtn.onclick = async () => {
                    console.log(`Delete file: ${fileId}`);

                    let confirmDelete = confirm(`Are you sure you want to delete the file: ${fileName}?`);
                    if (confirmDelete) {
                        await internalDeleteFile(account, userId, fileId);
                        li.remove();
                    }
                };

                li.appendChild(a);
                li.appendChild(document.createTextNode(" - "));
                li.appendChild(downloadBtn);
                li.appendChild(document.createTextNode(" "));
                li.appendChild(deleteBtn);
                fileListUl.appendChild(li);
                fileListDiv.scrollTop = fileListDiv.scrollHeight;

                await new Promise(r => setTimeout(r, 50));
            }
        }
    }
    catch (e) {
        console.error(e);
    }

    fileLoadBtn.textContent = "Load";
    fileLoadBtn.disabled = false;
}