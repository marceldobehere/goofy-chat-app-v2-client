const statusSpan = document.getElementById('main-chat-status');

async function setStatus(status)
{
    statusSpan.textContent = status;
    console.log(`Status: ${status}`);
    await sleep(10);
}