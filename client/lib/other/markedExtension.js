
function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

const doesImageExist = (url) =>
    new Promise((resolve) => {
        const img = new Image();

        img.src = url;
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
    });

const doesVideoExist = (url) =>
    new Promise((resolve) => {
        const video = document.createElement("video");

        video.src = url;
        video.onloadedmetadata = () => resolve(true);
        video.onerror = () => resolve(false);
    });

// function isBelowViewport(element) {
//     let rect = element.getBoundingClientRect();
//     let html = document.documentElement;
//     return (
//         //rect.top >= 0 &&
//         rect.left >= 0 &&
//         //rect.bottom <= (window.innerHeight || html.clientHeight) &&
//         rect.right <= (window.innerWidth || html.clientWidth)
//     );
// }

const fixSizeScroll = (element) => {
    // if (isBelowViewport(element))
    //     return;

    // make it scroll down by the element height
    docChatList.scrollTop += element.clientHeight;
}

// Override function
const renderer = {
    image(token) {
        let url = token.href;
        let text = token.text;

        if (url.startsWith(filePathStart))
        {
            let fileId = url.substring(filePathStart.length);
            let randomInt = getRandomIntInclusive(100000, 9999999);
            let imgId = `img-${fileId}-${randomInt}`;
            waitForElm(`#${imgId}`).then(async (element) => {
                let file = await internalGetFile(currentUser['mainAccount'], getCurrentChatUserId(), parseInt(fileId));
                console.log(file);
                let fileData = file["data"]; // is a uint8array
                let filename = file["filename"];

                let blob = new Blob([fileData]);//, {type: "image/png"});
                let url = URL.createObjectURL(blob);

                if (await doesImageExist(url))
                {
                    let imgNode = document.createElement("img");
                    imgNode.src = url;
                    imgNode.alt = filename;
                    imgNode.className = "chat-image";
                    imgNode.onload = () => fixSizeScroll(imgNode);
                    element.replaceWith(imgNode);

                    imgNode.onclick = () => {
                        // open image in new tab
                        // include the type of image
                        let newBlob = new Blob([fileData], {type: "image/png"});
                        let newUrl = URL.createObjectURL(newBlob);
                        let newTab = window.open(newUrl, "_blank");
                        newTab.focus();
                    };
                }
                else if (await doesVideoExist(url))
                {
                    let videoNode = document.createElement("video");
                    videoNode.src = url;
                    videoNode.alt = filename;
                    videoNode.className = "chat-video";
                    videoNode.controls = true;
                    videoNode.onload = () => fixSizeScroll(videoNode);
                    element.replaceWith(videoNode);
                }
                else {
                    let aNode = document.createElement("a");
                    aNode.href = url;
                    aNode.download = filename;
                    aNode.textContent = `[${filename}]`;
                    element.replaceWith(aNode);
                }
            });
            return `<a id="${imgId}">[Loading]</a>`;
        }
        else
            return `<a href="${url}" target="_blank">[Image ${text}]</a>`;
    },

    link(token) {
        let url = token.href;
        let text = token.text;
        return `<a href="${url}" target="_blank">${text}</a>`;
    },

    code(token) {
        let codeRes = token.text;
        let lang = token.lang;
        if (lang)
        {
            try {
                let code = hljs.highlight(codeRes, {language:lang, ignoreIllegals:true});
                codeRes = code.value;
            } catch (e) {
                logError(e);
            }
        }
        else
            codeRes = codeRes.replaceAll("\n", "<br>");

        return `<code class="code code-block">${codeRes}</code>`;
    },

    codespan(token) {
        let text = token.text;
        return `<code class="code code-span">${text}</code>`;
    },

    html(token) {
        let text = token.text;
        text = text.replaceAll("<", "&lt;");
        text = text.replaceAll(">", "&gt;");
        text = text.replaceAll("\n", "<br>");
        return text;
    }
};

marked.use({useNewRenderer: true, renderer, breaks: true });