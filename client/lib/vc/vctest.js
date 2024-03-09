const videoContainer = document.getElementById('vctest-video-container');
const canvasContainer = document.getElementById('canvasContainer');
const callButton = document.getElementById('vctest-call-btn');
const hangupButton = document.getElementById('vctest-hang-up-btn');
const toggleAudioButton = document.getElementById('vctest-audio-enable-btn');
const toggleWebcamButton = document.getElementById('vctest-webcam-enable-btn');
const toggleStreamButton = document.getElementById('vctest-stream-enable-btn');

const servers = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302'
            ]
        },
    ],
    iceCandidatePoolSize: 10
};
let silenceCtx = [];
async function resumeSilence() {
    for (let ctx of silenceCtx) {
        try {
            await ctx.resume();
        }
        catch (e)
        {

        }
    }
}

let silence = () => {
    let ctx = new AudioContext(), oscillator = ctx.createOscillator();
    silenceCtx.push(ctx);
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    return Object.assign(dst.stream.getAudioTracks()[0], {enabled: false});
}
let black = ({width = 640, height = 480} = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {width, height});
    canvas.getContext('2d').fillRect(0, 0, width, height);
    canvasContainer.appendChild(canvas);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], {enabled: true});
}

const defaultVideoBlackSilence = new MediaStream([black({width: 20, height: 10}), silence()]);

const defaultCameraSilence = silence();
const defaultCameraBlack = black({width: 20, height: 10});
const defaultCameraBlackSilence = new MediaStream([defaultCameraBlack, defaultCameraSilence]);

const defaultStreamSilence = silence();
const defaultStreamBlack = black({width: 20, height: 10});
const defaultStreamBlackSilence = new MediaStream([defaultStreamBlack, defaultStreamSilence]);




let otherMembers = {};
let joiningMembers = [];
let localCameraVideo = undefined;
let localStreamVideo = undefined;


let mediaLocalCameraTrack = defaultCameraBlack;
let mediaLocalMicrophoneTrack = defaultCameraSilence;
let mediaLocalStreamVideoTrack = defaultStreamBlack;
let mediaLocalStreamAudioTrack = defaultStreamSilence;

function createVideoElement(title, shouldUnmute, alwaysVisible)
{
    let localVideoDiv = document.createElement("div");
    localVideoDiv.className = "video-entry";
    let localVideoTitle = document.createElement("h3");
    localVideoTitle.textContent = title;
    let localVideo = document.createElement("video");
    localVideo.autoplay = true;
    localVideo.controls = true;
    localVideo.muted = true;
    localVideo.srcObject = defaultVideoBlackSilence;
    localVideoDiv.style.display = alwaysVisible ? "" : "none";
    {
        let firstUnmute = true;
        localVideo.onloadedmetadata = async () => {
            if (!alwaysVisible)
                localVideoDiv.style.display =  (localVideo.srcObject === null || localVideo.videoWidth <= 50 || localVideo.videoHeight <= 50) ? "none" : "";

            await localVideo.play();

            if (firstUnmute && shouldUnmute)
            {
                localVideo.muted = false;
                firstUnmute = false;
            }
        };
        if (!alwaysVisible)
        {
            let id = setInterval(() => {
                localVideoDiv.style.display =  (localVideo.srcObject === null || localVideo.videoWidth <= 50 || localVideo.videoHeight <= 50) ? "none" : "";
            }, 500);
            localVideo.onclose = () => {
                clearInterval(id);
            };
        }
    }
    localVideoDiv.appendChild(localVideoTitle);
    localVideoDiv.appendChild(localVideo);
    videoContainer.appendChild(localVideoDiv);
    return localVideo;
}

function addLocalVideos()
{
    localCameraVideo = createVideoElement("Local Camera", false, true);
    localStreamVideo = createVideoElement("Local Stream", false, false);

    localCameraVideo.srcObject = new MediaStream([mediaLocalCameraTrack, mediaLocalMicrophoneTrack]);
    localStreamVideo.srcObject =  new MediaStream([mediaLocalStreamVideoTrack, mediaLocalStreamAudioTrack]);
}

async function initVcTest()
{
    // Attach Hooks
    extFnVcOnReceiveCallOffer = VCTEST_onReceiveCallOffer;
    extFnVcOnReceiveCallReply = VCTEST_onReceiveCallReply;
    extFnVcOnReceiveIceCandidate = VCTEST_onReceiveIceCandidate;
    extFnVcOnReceiveHangup = VCTEST_onReceiveHangup;
    extFnVcOnMemberJoin = VCTEST_onMemberJoin;
    extFnVcOnMemberJoinFailed = VCTEST_onMemberJoinFailed;

    // Clear other members
    otherMembers = {};
    joiningMembers = [];

    // Reset Video List
    videoContainer.innerHTML = "";
    addLocalVideos();

    // Attach Event Handlers
    callButton.addEventListener('click', callPressed);
    hangupButton.addEventListener('click', hangupPressed);
    toggleAudioButton.addEventListener('click', toggleAudio);
    toggleWebcamButton.addEventListener('click', toggleWebcam);
    toggleStreamButton.addEventListener('click', toggleStream);

    // Set User ID
    let userIdSpan = document.getElementById('test-user-id');
    userIdSpan.innerText = currentUser["mainAccount"]["userId"];
}

async function tryGetPerms(audio, video)
{
    try {
        let constraint = {};
        if (audio)
            constraint.audio = true;
        if (video)
            constraint.video = true;
        await navigator.mediaDevices.getUserMedia(constraint);
        await resumeSilence();
    }
    catch (e) {

    }
}

async function updateAllRemoteTracks(trackType, trackIndex, track)
{
    if (track == defaultCameraBlack)
        track = black({width: 20, height: 10});
    if (track == defaultCameraSilence)
        track = silence();
    if (track == defaultStreamBlack)
        track = black({width: 20, height: 10});
    if (track == defaultStreamSilence)
        track = silence();

    for (let userId in otherMembers)
    {
        let pc = otherMembers[userId]["pc"];
        if (pc === undefined)
            continue;

        // Replace track in peer connection
        const sender = pc.getSenders().filter((s) => {
            return s.track.kind === trackType;
        })[trackIndex];

        if (sender)
        {
            await sender.replaceTrack(track);
            console.log(`Replaced ${trackType} track ${trackIndex} for ${userId} with`, track)
        }
        else
            logError(`No sender found for track kind ${track.kind}`);
    }
}

async function toggleAudio()
{
    await tryGetPerms(true, false);

    if (mediaLocalMicrophoneTrack === defaultCameraSilence)
    {
        // Get all audio devices
        let devices = await navigator.mediaDevices.enumerateDevices();
        let audioDevices = devices.filter(device => device.kind === 'audioinput');

        if (audioDevices.length === 0)
        {
            logError("No audio devices found");
            return;
        }

        // Log all audio devices with label
        let tempStr = "";
        for (let i = 0; i < audioDevices.length; i++)
            tempStr += `[${i}]: ${audioDevices[i].label}\n`;

        // Ask user which audio device they want to use
        let audioIndex = prompt(`Enter audio device index: \n${tempStr}`);
        if (audioIndex === null || audioIndex === "" || audioDevices[audioIndex] === undefined)
            return;

        // Get audio stream from selected device
        try {
            let tempLocalAudioStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: audioDevices[audioIndex].deviceId } });
            mediaLocalMicrophoneTrack = tempLocalAudioStream.getAudioTracks()[0];
        }
        catch (e) {
            alert(e);
            return;
        }

        toggleAudioButton.textContent = "Disable Audio";
    }
    else
    {
        mediaLocalMicrophoneTrack.stop();
        mediaLocalMicrophoneTrack = defaultCameraSilence;

        toggleAudioButton.textContent = "Enable Audio";
    }

    localCameraVideo.srcObject = new MediaStream([mediaLocalCameraTrack, mediaLocalMicrophoneTrack]);
    await updateAllRemoteTracks("audio", 0, mediaLocalMicrophoneTrack);
}

async function toggleWebcam()
{
    await tryGetPerms(false, true);

    if (mediaLocalCameraTrack === defaultCameraBlack)
    {
        // Get all video devices
        let devices = await navigator.mediaDevices.enumerateDevices();
        let videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0)
        {
            logError("No video devices found");
            return;
        }

        // Log all video devices with label
        let tempStr = "";
        for (let i = 0; i < videoDevices.length; i++)
            tempStr += `[${i}]: ${videoDevices[i].label}\n`;

        // Ask user which video device they want to use
        let videoIndex = prompt( `Enter video device index: \n${tempStr}`);
        if (videoIndex === null || videoIndex === "" || videoDevices[videoIndex] === undefined)
            return;

        // Get video stream from selected device
        try {
            let tempLocalVideoStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: videoDevices[videoIndex].deviceId } });
            mediaLocalCameraTrack = tempLocalVideoStream.getVideoTracks()[0];
        }
        catch (e) {
            alert(e);
            return;
        }

        toggleWebcamButton.textContent = "Disable Webcam";
    }
    else
    {
        mediaLocalCameraTrack.stop();
        mediaLocalCameraTrack = defaultCameraBlack;

        toggleWebcamButton.textContent = "Enable Webcam";
    }

    localCameraVideo.srcObject = new MediaStream([mediaLocalCameraTrack, mediaLocalMicrophoneTrack]);
    await updateAllRemoteTracks("video", 0, mediaLocalCameraTrack);
}

async function toggleStream()
{
    if (mediaLocalStreamAudioTrack === defaultStreamSilence && mediaLocalStreamVideoTrack === defaultStreamBlack)
    {
        try {
            let stream = await navigator.mediaDevices.getDisplayMedia({audio: true, video: true});

            mediaLocalStreamAudioTrack = stream.getAudioTracks()[0];
            if (mediaLocalStreamAudioTrack === undefined)
                mediaLocalStreamAudioTrack = defaultStreamSilence;

            mediaLocalStreamVideoTrack = stream.getVideoTracks()[0];
            if (mediaLocalStreamVideoTrack === undefined)
                mediaLocalStreamVideoTrack = defaultStreamBlack;
        }
        catch (e) {
            alert(e);
            return;
        }

        if (mediaLocalStreamAudioTrack === defaultStreamSilence && mediaLocalStreamVideoTrack === defaultStreamBlack)
        {
            alert("No audio or video stream found");
            return;
        }
        else
            toggleStreamButton.textContent = "Disable Stream";
    }
    else
    {
        mediaLocalStreamAudioTrack.stop();
        mediaLocalStreamAudioTrack = defaultStreamSilence;
        mediaLocalStreamVideoTrack.stop();
        mediaLocalStreamVideoTrack = defaultStreamBlack;

        toggleStreamButton.textContent = "Enable Stream";
    }

    localStreamVideo.srcObject = new MediaStream([mediaLocalStreamVideoTrack, mediaLocalStreamAudioTrack]);
    await updateAllRemoteTracks("audio", 1, mediaLocalStreamAudioTrack);
    await updateAllRemoteTracks("video", 1, mediaLocalStreamVideoTrack);
}


async function newPeerConnection(userId)
{
    if (otherMembers[userId] !== undefined)
    {
        logError("Peer connection already exists");
        return;
    }

    otherMembers[userId] = {};

    let pc = new RTCPeerConnection(servers);
    otherMembers[userId]["pc"] = pc;

    pc.onicecandidate = event => {
        event.candidate && sendSecureMessageToUser(currentUser["mainAccount"], userId, {candidate: event.candidate}, "ice-candidate", true)
    }

    otherMembers[userId]["remoteStream"] = new MediaStream();
    pc.ontrack = event => {
        console.log("> EVENT", event);
        for (let stream of event.streams)
            console.log(stream.getTracks());

        if (event.streams.length != 1)
            return;

        // otherMembers[userId]["remoteStream"].getTracks().forEach(track => {
        //     track.stop();
        // });

        let remoteStream = new MediaStream();
        let remoteCameraVideoTrack = event.streams[0].getVideoTracks()[0];
        let remoteCameraAudioTrack = event.streams[0].getAudioTracks()[0];
        let remoteStreamVideoTrack = event.streams[0].getVideoTracks()[1];
        let remoteStreamAudioTrack = event.streams[0].getAudioTracks()[1];

        remoteStream.addTrack(remoteCameraVideoTrack);
        remoteStream.addTrack(remoteCameraAudioTrack);
        remoteStream.addTrack(remoteStreamVideoTrack);
        remoteStream.addTrack(remoteStreamAudioTrack);

        otherMembers[userId]["remoteStream"] = remoteStream;

        let tracks = remoteStream.getTracks();
        console.log("TRACKS");
        console.log(tracks);

        otherMembers[userId]["remoteCameraVideo"].srcObject = new MediaStream([remoteCameraVideoTrack, remoteCameraAudioTrack]);
        otherMembers[userId]["remoteStreamVideo"].srcObject = new MediaStream([remoteStreamVideoTrack, remoteStreamAudioTrack]);
    }

    let localCameraStream = new MediaStream();
    pc.addTrack(mediaLocalCameraTrack, localCameraStream);
    pc.addTrack(mediaLocalMicrophoneTrack, localCameraStream);
    let localStreamStream = new MediaStream();
    pc.addTrack(mediaLocalStreamVideoTrack, localCameraStream);
    pc.addTrack(mediaLocalStreamAudioTrack, localCameraStream);

    let remoteCameraVideo = createVideoElement(`${userId}'s Camera`, true, true);
    otherMembers[userId]["remoteCameraVideo"] = remoteCameraVideo;

    let remoteStreamVideo = createVideoElement(`${userId}'s Stream`, true, false);
    otherMembers[userId]["remoteStreamVideo"] = remoteStreamVideo;

    return pc;
}

async function removeUser(userId)
{
    if (otherMembers[userId] === undefined)
    {
        logError("Peer connection does not exist");
        return;
    }

    otherMembers[userId]["pc"].close();
    otherMembers[userId]["remoteStream"].getTracks().forEach(track => {
        track.stop();
    });
    otherMembers[userId]["remoteCameraVideo"].srcObject = defaultVideoBlackSilence;
    otherMembers[userId]["remoteStreamVideo"].srcObject = defaultVideoBlackSilence;

    videoContainer.removeChild(otherMembers[userId]["remoteCameraVideo"].parentElement);

    delete otherMembers[userId];
}

async function notifyUserJoin(joinUserId)
{
    for (let userId in otherMembers)
        await sendSecureMessageToUser(currentUser["mainAccount"], userId, {userId: joinUserId}, "call-join", true);
    logInfo(`Notified all users of ${joinUserId}'s join`);
}

async function notifyUserJoinFailed(joinUserId)
{
    for (let userId in otherMembers)
        await sendSecureMessageToUser(currentUser["mainAccount"], userId, {userId: joinUserId}, "call-join-fail", true);
    logInfo(`Notified all users of ${joinUserId}'s join failure`);
}

function getAllCurrentUsers()
{
    let users = [];
    for (let userId in otherMembers)
        users.push(userId);
    return users;

}

async function startCall(remoteUserId, userInteraction)
{
    let users = getAllCurrentUsers();
    let pc = await newPeerConnection(remoteUserId);
    if (pc === undefined)
        return;

    let offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    let offerObj = {
        sdp: offer.sdp,
        type: offer.type,
        users: users
    };

    let res = await sendSecureMessageToUser(currentUser["mainAccount"], remoteUserId, offerObj, "call-start", true);
    if (!res)
    {
        await removeUser(remoteUserId);
        alert("Failed to send call start message");
    }

    await notifyUserJoin(remoteUserId);
}

async function callPressed()
{
    await resumeSilence();

    let remoteUserId = prompt("Enter remote user ID:");
    if (remoteUserId === null)
        return;
    try {
        remoteUserId = parseInt(remoteUserId);
    }
    catch (e) {
        alert("Invalid user ID");
        return;
    }

    await startCall(remoteUserId, true);
}

async function hangupPressed()
{
    for (let userId in otherMembers)
    {
        await sendSecureMessageToUser(currentUser["mainAccount"], userId, {}, "call-stop", true);
        await removeUser(userId);
    }
}

function doStreamRefresh()
{
    setTimeout(async () => {
        if (mediaLocalCameraTrack === defaultCameraBlack)
            await updateAllRemoteTracks("video", 0, defaultCameraBlack);
        if (mediaLocalMicrophoneTrack === defaultCameraSilence)
            await updateAllRemoteTracks("audio", 0, defaultCameraSilence);
        if (mediaLocalStreamVideoTrack === defaultStreamBlack)
            await updateAllRemoteTracks("video", 1, defaultStreamBlack);
        if (mediaLocalStreamAudioTrack === defaultStreamSilence)
            await updateAllRemoteTracks("audio", 1, defaultStreamSilence);
    }, 500);
}

async function VCTEST_onReceiveCallOffer(account, userIdTo, message)
{
    let otherUsers = message["users"];
    let callOtherUsers = false;

    let accept = false;
    console.log("CALL OFFER:");
    console.log(userIdTo);
    console.log(joiningMembers)
    if (joiningMembers.includes(userIdTo))
    {
        joiningMembers.splice(joiningMembers.indexOf(userIdTo), 1);
        accept = true;
    }
    else if (getAllCurrentUsers().length > 0)
    {
        accept = false;
        alert(`Call from ${userIdTo} declined because in an active call right now.`);
    }
    else
    {
        accept = confirm(`Accept call from ${userIdTo}? (${JSON.stringify(otherUsers)})`);
        callOtherUsers = true;
    }
    callOtherUsers &= accept;

    if (!accept)
    {
        await sendSecureMessageToUser(account, userIdTo, {answer: null}, "call-reply", true);
        return;
    }

    let pc = await newPeerConnection(userIdTo);
    if (pc === undefined)
        return;

    let desc = {
        type: message["type"],
        sdp: message["sdp"]
    };



    await pc.setRemoteDescription(new RTCSessionDescription(desc));

    let answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    let answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    };

    let res = await sendSecureMessageToUser(account, userIdTo, {answer: answer}, "call-reply", true);
    if (!res)
    {
        await removeUser(userIdTo);
        alert("Failed to send call reply message");
    }

    doStreamRefresh();

    if (callOtherUsers)
    {
        for (let joiningUserId of otherUsers)
        {
            await startCall(joiningUserId, false);
        }
    }
}

async function VCTEST_onReceiveCallReply(account, userIdTo, message)
{
    if (message["answer"] === null)
    {
        await removeUser(userIdTo);
        await notifyUserJoinFailed(userIdTo);
        alert(`Call with ${userIdTo} declined`);
        return;
    }

    let pc = otherMembers[userIdTo]["pc"];
    await pc.setRemoteDescription(new RTCSessionDescription(message["answer"]));

    doStreamRefresh();
}

async function VCTEST_onMemberJoin(account, userIdTo, message)
{
    let joiningUserId = message["userId"];
    if (joiningMembers.includes(joiningUserId))
        return;
    joiningMembers.push(joiningUserId);
    logInfo(`User ${joiningUserId} joining the call`);
}

async function VCTEST_onMemberJoinFailed(account, userIdTo, message)
{
    let joiningUserId = message["userId"];
    if (!joiningMembers.includes(joiningUserId))
        return;
    joiningMembers.splice(joiningMembers.indexOf(joiningUserId), 1);
    logInfo(`User ${joiningUserId} failed to join the call`);
}

async function VCTEST_onReceiveIceCandidate(account, userIdTo, message)
{
    let candidate = new RTCIceCandidate(message["candidate"]);
    await otherMembers[userIdTo]["pc"].addIceCandidate(candidate);
}

async function VCTEST_onReceiveHangup(account, userIdTo, message)
{
    await removeUser(userIdTo);
    alert(`Call with ${userIdTo} ended`);
}