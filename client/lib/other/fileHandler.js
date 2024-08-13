async function handleFileDescMsg(account, user, msg)
{
    logInfo("> File Desc: ", msg["data"]);

    // TODO: parse filedata and save it in db
}

async function handleFileChunkMsg(account, user, msg)
{
    logInfo("> File Chunk: ", msg["data"]);
    let chunkIndex = msg["data"]["chunkIndex"];
    let fileId = msg["data"]["fileId"];
    let chunkData = msg["data"]["data"];

    let buf = Uint8Array.from(atob(chunkData), c => c.charCodeAt(0));
    //console.log(buf);
    let decompressed = await decompressBuffer(buf);
    console.log(decompressed);

    // TODO: Call db functions to save the chunk
}

async function handleGetFileInfo(account, user, fileId)
{
    // TODO: Call db funcs to get the file data (just name, size, etc.) and return it
    return undefined;
}


async function handleGetFile(account, user, fileId)
{
    // TODO: Call db funcs to get the file data, maybe combine chunks and return the whole object
    return undefined;
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