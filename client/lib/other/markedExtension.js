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
                let img = await internalGetFile(currentUser['mainAccount'], getCurrentChatUserId(), parseInt(fileId));
                console.log(img);
                let fileData = img["data"]; // is a uint8array
                let filename = img["filename"];
                let blob = new Blob([fileData], {type: "image/png"});
                let url = URL.createObjectURL(blob);
                element.src = url;
            });
            return `<img src="" alt="${text}" id="${imgId}">`;
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