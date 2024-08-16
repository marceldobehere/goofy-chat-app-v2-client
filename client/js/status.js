const statusSpan = document.getElementById('main-chat-status');

function setStatus(status)
{
    statusSpan.textContent = status;
    console.log(`Status: ${status}`);
}