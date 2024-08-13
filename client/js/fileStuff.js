const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});

// https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string
function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

async function trySendFile(file)
{
    if (!file)
        return;
    if (file.size == 0)
        return;

    const chunkSize = 100 * 1024;

    console.log(`> File \"${file.name}\" (${file.size} bytes)`);
    // let imgData = await toBase64(file);
    // console.log(imgData);
    let fileId = getRandomIntInclusive(100000000, 99999999999);

    let res = await doMsgSendThingy("file-desc", {filename:file.name, filesize:file.size, chunkSize:chunkSize, fileId: fileId}, true);

    // Read the file in chunks and send them
    let reader = new FileReader();
    let chunkIndex = 0;
    let chunkCount = Math.ceil(file.size / chunkSize);

    // Upload chunks
    let lastReply = undefined;
    while (chunkIndex < chunkCount)
    {
        console.log(`  > Uploading... ${Math.round((10000*chunkIndex) / chunkCount) / 100}%`);
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
        console.log(`  > Chunk ${chunkIndex}: ${end}/${file.size} -> ${chunkData.byteLength} bytes`);
        let compressed = await compressBuffer(chunkData);
        let chunkStr = _arrayBufferToBase64(compressed);
        console.log(`${chunkData.byteLength} -> ${compressed.byteLength} -> ${chunkStr.length}`);

        res = await doMsgSendThingy("file-chunk", {fileId:fileId, chunkIndex: chunkIndex, data: chunkStr}, true);

        // let reply = await msgSendAndGetReply("do-upload", {"id": id, "chunkIndex": chunkIndex, "data": chunkData});
        // if (reply["error"] != undefined) {
        //     lockUpload.disable();
        //     return {error: reply["error"]};
        // }
        //console.log("> Chunk upload reply: ", reply);
        //lastReply = reply;

        chunkIndex++;
    }

    // if (lastReply == undefined) {
    //     lockUpload.disable();
    //     return {error: "No reply from server"};
    // }

    //console.log("> Last reply: ", lastReply);

    console.log(" > Done.")

}


async function filePastedInTextArea(event)
{
    console.log("PASTE");
    const dT = event.clipboardData || window.clipboardData;
    const files = dT.files;
    console.log(files);

    for (let file of files)
    {
        console.log(`> Sending file: `, file);
        await trySendFile(file);
    }

    // // check for potentially an image link
    // if (!file)
    // {
    //     let text = dT.getData('text');
    //     if (await isImageValid(text))
    //     {
    //         if (!confirm(`Send image?`))
    //             return;
    //
    //         await doMailSending(undefined, {name: "text", data: text}, "image");
    //
    //         // clear input box
    //         document.getElementById('message-input').value = "";
    //         return;
    //     }
    // }
    //
    //
    // if (!file)
    //     return;
    //
    // //console.log(file.name);
    // //console.log(file.size);
    // let imgData = await toBase64(file);
    // //console.log(imgData);
    //
    // let isImg = await isImageValid(imgData);
    // //console.log(isImg);
    //
    // // ask if you want to send the image
    // if (!confirm(`Send ${(isImg ? "image" : "file")}?`))
    //     return;
    //
    // await doMailSending(undefined, {name: file.name, data: imgData}, (isImg ? "image" : "file"));
}