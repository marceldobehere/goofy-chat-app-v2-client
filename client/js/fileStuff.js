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

async function trySendFile(file, serverId, channelId, statusCallBack) {
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


        let p1 = doMsgSendThingySpecific("file-msg", sendMsg, serverId, channelId, true);
        //promiseArr.push(p1);
        await p1;

        let p2 = handleFilePartMsg(currentUser['mainAccount'], getChatUserIdSpecific(serverId, channelId), {data: sendMsg});
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

    await doMsgSendThingySpecific("text", `![${file.name}](${filePathStart + fileId})`, serverId, channelId);
    console.log(" > Done.")
}

async function fileAddClicked(event)
{
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.onchange = async () => {
        let files = fileInput.files;
        if (files.length > 0)// && confirm(`Send ${files.length} file(s) to the chat?`))
            for (let file of files) {
                await addFileStatListEntry(file);
            }
    };
    fileInput.click();
}

async function fileDroppedInTextArea(event) {
    event.preventDefault();
    console.log(`File dropped in text area`, event);

    const files = event.dataTransfer.files;
    if (files.length > 0)// && confirm(`Send ${files.length} file(s) to the chat?`))
        for (let file of files) {
            await addFileStatListEntry(file);
        }
}

async function uploadFileFromString(str, filename)
{
    let file = new File([str], filename);
    await addFileStatListEntry(file);
}

async function filePastedInTextArea(event) {
    const dT = event.clipboardData || window.clipboardData;
    const files = dT.files;

    // Upload files
    if (files.length > 0)// && confirm(`Send ${files.length} file(s) to the chat?`))
        for (let file of files) {
            await addFileStatListEntry(file);
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