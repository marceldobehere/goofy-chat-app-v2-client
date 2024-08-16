const fileListUl = document.getElementById("settings-file-list-ul");
const fileListDiv = document.getElementById("settings-file-list-div");
const fileLoadBtn = document.getElementById("settings-file-list-load-btn");
const fileListInfo = document.getElementById("settings-file-list-info");

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

async function trySendFile(file, statusCallBack) {
    if (!file)
        return;
    if (file.size == 0)
        return;

    if (file.size > 50 * 1024 * 1024) {
        if (!confirm("This file is VERY VERY large. Are you sure you want to send it? (This could take ages)"))
            return;
    }
    else if (file.size > 25 * 1024 * 1024) {
        if (!confirm("This file is very large. Are you sure you want to send it? (This could take a while)"))
            return;
    }
    else if (file.size > 10 * 1024 * 1024) {
        if (!confirm("This file is large. Are you sure you want to send it?"))
            return;
    }
    else if (file.size > 6 * 1024 * 1024) {
        if (!confirm("This file is a bit large. Are you sure you want to send it?"))
            return;
    }


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

        if (statusCallBack)
            try {
                // (fileId, bytesSent, totalBytes, chunkIndex, chunkCount)
                statusCallBack(fileId, end, file.size, chunkIndex, chunkCount);
            } catch (e) {
                console.error(e);
            }

        chunkIndex++;
    }
    // await Promise.all(promiseArr);

    await doMsgSendThingy("text", `![${file.name}](${filePathStart + fileId})`);
    console.log(" > Done.")
}

async function fileAddClicked(event)
{
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.onchange = async () => {
        let files = fileInput.files;
        if (files.length > 0 && confirm(`Send ${files.length} file(s) to the chat?`))
            for (let file of files) {
                console.log(`> Sending file: `, file);
                await trySendFile(file);
            }
    };
    fileInput.click();
}

async function fileDroppedInTextArea(event) {
    event.preventDefault();
    console.log(`File dropped in text area`, event);

    const files = event.dataTransfer.files;
    if (files.length > 0 && confirm(`Send ${files.length} file(s) to the chat?`))
        for (let file of files) {
            console.log(`> Sending file: `, file);
            await trySendFile(file);
        }
}

async function uploadFileFromString(str, filename)
{
    let file = new File([str], filename);
    await trySendFile(file);
}

async function filePastedInTextArea(event) {
    const dT = event.clipboardData || window.clipboardData;
    const files = dT.files;

    // Upload files
    if (files.length > 0 && confirm(`Send ${files.length} file(s) to the chat?`))
        for (let file of files) {
            console.log(`> Sending file: `, file);
            await trySendFile(file);
        }

    // Upload clipboard as a file if it's a long string
    let paste = (event.clipboardData || window.clipboardData).getData("text");
    if (paste != undefined && paste.length > 1000)
    {
        console.log(paste);
        if (!confirm("Upload the clipboard as a file?"))
        {
            if (paste.length < 10000)
                return;
            else
            {
                event.preventDefault();
                return alert("This is a bit much text for the input smh");
            }
        }


        event.preventDefault();
        await uploadFileFromString(paste, "message.txt");
    }
}



const sizeThingy = [
    {size: 1,unit: "B"},
    {size: 1024,unit: "KiB"},
    {size: 1024*1024,unit: "MiB"},
    {size: 1024*1024*1024,unit: "GiB"},
    {size: 1024*1024*1024*1024,unit: "TiB"}
].reverse();

function dynamicSizeDisplay(byteCount)
{
    let yesIndex = sizeThingy.findIndex(x => byteCount > x.size);
    if (yesIndex == -1)
        yesIndex = 0;

    let size = sizeThingy[yesIndex];
    let sizeStr = `${Math.round((byteCount * 100) / size.size) / 100} ${size.unit}`;

    return sizeStr;
}


let fileStatsCount = 0;
let fileStatsSize = 0;
function displayFileListStats() {
    fileListInfo.textContent = `Files: ${fileStatsCount} | Total size: ${dynamicSizeDisplay(fileStatsSize)}`;
}


async function loadFileList(account) {
    fileListUl.innerHTML = "";
    fileLoadBtn.textContent = "Loading...";
    fileLoadBtn.disabled = true;
    fileListInfo.textContent = "";

    fileStatsCount = 0;
    fileStatsSize = 0;

    try {
        let files = await internalGetAllRawFiles(account);


        for (let file of files)
        {
            fileStatsCount++;
            fileStatsSize += file["info"]["fileSize"];
            displayFileListStats();

            let li = document.createElement("li");
            let a = document.createElement("a");
            let downloadBtn = document.createElement("button");
            let deleteBtn = document.createElement("button");

            let fileId = file["fileId"];
            let fileName = file["info"]["filename"];
            let fileSize = file["info"]["fileSize"];
            let userId = file["userId"];

            a.textContent = `[${fileName}] (${dynamicSizeDisplay(fileSize)}) (${userId})`;
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

                    fileStatsCount--;
                    fileStatsSize -= fileSize;
                    displayFileListStats();
                }
            };

            li.appendChild(a);
            li.appendChild(document.createTextNode(" - "));
            li.appendChild(downloadBtn);
            li.appendChild(document.createTextNode(" "));
            li.appendChild(deleteBtn);
            fileListUl.appendChild(li);
            fileListDiv.scrollTop = fileListDiv.scrollHeight;

            await sleep(10);
        }
    }
    catch (e) {
        console.error(e);
    }

    fileLoadBtn.textContent = "Load";
    fileLoadBtn.disabled = false;
}