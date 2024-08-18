// https://stackoverflow.com/questions/14011021/how-to-download-a-base64-encoded-image

// Parameters:
// contentType: The content type of your file.
//              its like application/pdf or application/msword or image/jpeg or
//              image/png and so on
// base64Data: Its your actual base64 data
// fileName: Its the file name of the file which will be downloaded.

function downloadBase64File(base64DataStr, fileName) {
    const linkSource = base64DataStr;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
}

function downloadTextFile(str, fileName)
{
    downloadBase64File("data:text/plain;charset=utf-8," + encodeURIComponent(str), fileName);
}

function downloadBlob(blob, fileName)
{
    const url = URL.createObjectURL(blob);
    downloadBase64File(url, fileName);
}

function openFilePrompt()
{
    return new Promise((resolve, reject) =>
    {
        let fileSelector = document.createElement('input');
        fileSelector.setAttribute('type', 'file');
        fileSelector.oninput = (data) =>
        {
            console.log(data);
            if (fileSelector.files[0])
            {
                let file = fileSelector.files[0];
                let reader = new FileReader();
                reader.readAsText(file, "UTF-8");
                reader.onload = (evt) => {
                    try
                    {
                        let data = evt.target.result;
                        let dataObj = JSON.parse(data);
                        resolve(dataObj);
                    }
                    catch (e)
                    {
                        alert("Error parsing file");
                        reject();
                        return;
                    }
                }
                reader.onerror = (evt) => {
                    alert("Error reading file");
                    reject();
                }
            }
        };
        fileSelector.onclose = () => {
            resolve();
        };
        fileSelector.oncancel = () => {
            resolve();
        };

        fileSelector.click();
    });
}

function openBinaryFilePrompt()
{
    return new Promise((resolve, reject) =>
    {
        let fileSelector = document.createElement('input');
        fileSelector.setAttribute('type', 'file');
        fileSelector.oninput = (data) =>
        {
            console.log(data);
            if (fileSelector.files[0])
            {
                let file = fileSelector.files[0];
                let reader = new FileReader();
                reader.readAsArrayBuffer(file);
                reader.onload = (evt) => {
                    try
                    {
                        let data = evt.target.result;
                        resolve(data);
                    }
                    catch (e)
                    {
                        alert("Error parsing file");
                        reject();
                        return;
                    }
                }
                reader.onerror = (evt) => {
                    alert("Error reading file");
                    reject();
                }
            }
        };
        fileSelector.onclose = () => {
            reject();
        };
        fileSelector.oncancel = () => {
            reject();
        };

        fileSelector.click();
    });
}