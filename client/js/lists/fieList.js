const fileListUl = document.getElementById("settings-file-list-ul");
const fileListDiv = document.getElementById("settings-file-list-div");
const fileLoadBtn = document.getElementById("settings-file-list-load-btn");
const fileListInfo = document.getElementById("settings-file-list-info");

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
        yesIndex = sizeThingy.length - 1;

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

    await sleep(500);
    fileLoadBtn.textContent = "Load";
    fileLoadBtn.disabled = false;
}