async function handleFilePartMsg(account, user, msg)
{
    logInfo("> Saving File Chunk: ", msg["data"]);
    let chunkIndex = msg["data"]["chunkIndex"];
    let fileInfo = msg["data"]["file"];
    let fileId = fileInfo["fileId"];

    // Check if the file exists in the db, if not, create
    if (!await internalHasFile(account, user, fileId))
    {
        //alert("Create fole")
        let filename = fileInfo["filename"];
        let fileSize = fileInfo["filesize"];
        let chunkSize = fileInfo["chunkSize"];

        if (filename == null || fileSize == null || chunkSize == null)
            return logError("Invalid file info: ", fileInfo);
        if (fileSize <= 0 || chunkSize <= 0)
            return logError("Invalid file size or chunk size: ", fileInfo);

        let fileEntry = {
            filename: filename,
            fileSize: fileSize,
            chunkSize: chunkSize,
        };

        await internalCreateFile(account, user, fileId, fileEntry);
    }
    //logInfo("> File Entry: ", fileEntry);

    let chunkData = msg["data"]["data"];
    let buf = Uint8Array.from(atob(chunkData), c => c.charCodeAt(0)); // highly cursed but apparently works
    let decompressed = await decompressBuffer(buf);

    // Save the new chunk data
    await internalUploadFile(account, user, fileId, {chunkIndex: chunkIndex, chunkData: decompressed});
}

// https://dev.to/lucasdamianjohnson/compress-decompress-an-arraybuffer-client-side-in-js-2nf6

async function compressBuffer(buffer)
{
    //create the stream
    const cs = new CompressionStream("gzip");
    //create the writer
    const writer = cs.writable.getWriter();
    //write the buffer to the writer
    writer.write(buffer);
    writer.close();
    //create the output
    const output= [];
    const reader = cs.readable.getReader();
    let totalSize = 0;
    //go through each chunk and add it to the output
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        output.push(value);
        totalSize += value.byteLength;
    }
    const concatenated = new Uint8Array(totalSize);
    let offset = 0;
    //finally build the compressed array and return it
    for (const array of output) {
        concatenated.set(array, offset);
        offset += array.byteLength;
    }
    return concatenated;
}

async function decompressBuffer(buffer)
{
    //create the stream
    const ds = new DecompressionStream("gzip");
    //create the writer
    const writer = ds.writable.getWriter();
    //write the buffer to the writer thus decompressing it
    writer.write(buffer);
    writer.close();
    //create the output
    const output= [];
    //create the reader
    const reader = ds.readable.getReader();
    let totalSize = 0;
    //go through each chunk and add it to the output
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        output.push(value);
        totalSize += value.byteLength;
    }
    const concatenated = new Uint8Array(totalSize);
    let offset = 0;
    //finally build the compressed array and return it
    for (const array of output) {
        concatenated.set(array, offset);
        offset += array.byteLength;
    }
    return concatenated;
}