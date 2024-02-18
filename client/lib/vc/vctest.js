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
        await ctx.resume();
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
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], {enabled: true});
}

const defaultSilence = silence();
const defaultBlack = black({width: 20, height: 10});
const defaultBlackSilence = new MediaStream([defaultBlack, defaultSilence]);

const videoContainer = document.getElementById('vctest-video-container');
const callButton = document.getElementById('vctest-call-btn');
const hangupButton = document.getElementById('vctest-hang-up-btn');
const toggleAudioButton = document.getElementById('vctest-audio-enable-btn');
const toggleWebcamButton = document.getElementById('vctest-webcam-enable-btn');
const toggleStreamButton = document.getElementById('vctest-stream-enable-btn');

let otherMembers = {};
let localCameraVideo = undefined;
let localStreamVideo = undefined;

let mediaLocalCameraTrack = defaultBlack;
let mediaLocalMicrophoneTrack = defaultSilence;
let mediaLocalStreamVideoTrack = defaultBlack;
let mediaLocalStreamAudioTrack = defaultSilence;

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
    localVideo.srcObject = defaultBlackSilence;
    localVideoDiv.style.display = alwaysVisible ? "" : "none";
    {
        let firstUnmute = true;
        localVideo.onloadedmetadata = async (e) => {
            if (!alwaysVisible)
                localVideoDiv.style.display =  (localVideo.srcObject === null || localVideo.videoWidth <= 50 || localVideo.videoHeight <= 50) ? "none" : "";

            await localVideo.play();

            if (firstUnmute && shouldUnmute)
            {
                localVideo.muted = false;
                firstUnmute = false;
            }
        };
    }
    localVideoDiv.appendChild(localVideoTitle);
    localVideoDiv.appendChild(localVideo);
    videoContainer.appendChild(localVideoDiv);
    return localVideo;
}

function addLocalVideos()
{
    mediaLocalCameraTrack = defaultBlack;
    mediaLocalMicrophoneTrack = defaultSilence;
    mediaLocalStreamVideoTrack = defaultBlack;
    mediaLocalStreamAudioTrack = defaultSilence;

    localCameraVideo = createVideoElement("Local Camera", false, true);
    localStreamVideo = createVideoElement("Local Stream", false, false);

    localCameraVideo.srcObject = new MediaStream([mediaLocalCameraTrack, mediaLocalMicrophoneTrack]);
    localStreamVideo.srcObject =  new MediaStream([mediaLocalStreamVideoTrack, mediaLocalStreamAudioTrack]);
}

async function initVcTest()
{
    // Clear other members
    otherMembers = {};

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

const localCameraVideoTrackIndex = 0, localCameraAudioTrackIndex = 1, localStreamVideoTrackIndex = 2, localStreamAudioTrackIndex = 3;
async function updateAllRemoteTracks(trackIndex, track)
{
    //     // Replace track in peer connection
    //     const sender = pc.getSenders().find((s) => {
    //         return s.track.kind === kind;
    //     });
    //
    //     if (sender)
    //         await sender.replaceTrack(track);
    //     else
    //         logError(`No sender found for track kind ${kind}`);
}

async function toggleAudio()
{
    await tryGetPerms(true, false);

    if (mediaLocalMicrophoneTrack === defaultSilence)
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
        mediaLocalMicrophoneTrack = defaultSilence;

        toggleAudioButton.textContent = "Enable Audio";
    }

    localCameraVideo.srcObject = new MediaStream([mediaLocalCameraTrack, mediaLocalMicrophoneTrack]);
    await updateAllRemoteTracks(localCameraAudioTrackIndex, mediaLocalMicrophoneTrack);
}

async function toggleWebcam()
{
    await tryGetPerms(false, true);

    if (mediaLocalCameraTrack === defaultBlack)
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
        mediaLocalCameraTrack = defaultBlack;

        toggleWebcamButton.textContent = "Enable Webcam";
    }

    localCameraVideo.srcObject = new MediaStream([mediaLocalCameraTrack, mediaLocalMicrophoneTrack]);
    await updateAllRemoteTracks(localCameraVideoTrackIndex, mediaLocalCameraTrack);
}

async function toggleStream()
{
    if (mediaLocalStreamAudioTrack == defaultSilence && mediaLocalStreamVideoTrack == defaultBlack)
    {
        try {
            let stream = await navigator.mediaDevices.getDisplayMedia({audio: true, video: true});

            mediaLocalStreamAudioTrack = stream.getAudioTracks()[0];
            if (mediaLocalStreamAudioTrack === undefined)
                mediaLocalStreamAudioTrack = defaultSilence;

            mediaLocalStreamVideoTrack = stream.getVideoTracks()[0];
            if (mediaLocalStreamVideoTrack === undefined)
                mediaLocalStreamVideoTrack = defaultBlack;
        }
        catch (e) {
            alert(e);
            return;
        }

        if (mediaLocalStreamAudioTrack == defaultSilence && mediaLocalStreamVideoTrack == defaultBlack)
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
        mediaLocalStreamAudioTrack = defaultSilence;
        mediaLocalStreamVideoTrack.stop();
        mediaLocalStreamVideoTrack = defaultBlack;

        toggleStreamButton.textContent = "Enable Stream";
    }

    localStreamVideo.srcObject = new MediaStream([mediaLocalStreamVideoTrack, mediaLocalStreamAudioTrack]);
    await updateAllRemoteTracks(localStreamAudioTrackIndex, mediaLocalStreamAudioTrack);
    await updateAllRemoteTracks(localStreamVideoTrackIndex, mediaLocalStreamVideoTrack);
}



async function callPressed()
{

}

async function hangupPressed()
{

}



async function VCTEST_onReceiveCallOffer(account, userIdTo, message)
{

}

async function VCTEST_onReceiveCallReply(account, userIdTo, message)
{

}

async function VCTEST_onReceiveIceCandidate(account, userIdTo, message)
{

}

async function VCTEST_onReceiveHangup(account, userIdTo, message)
{

}


// const localCameraVideo = document.getElementById('vctest-local-video');
// const remoteCameraVideo = document.getElementById('vctest-remote-video');
//
// const localStreamVideo = document.getElementById('vctest-local-stream');
// const remoteStreamVideo = document.getElementById('vctest-remote-stream');
//
// const callButton = document.getElementById('vctest-call-btn');
// const hangupButton = document.getElementById('vctest-hang-up-btn');
//
// const toggleWebcamButton = document.getElementById('vctest-webcam-enable-btn');
// const toggleStreamButton = document.getElementById('vctest-stream-enable-btn');
// const toggleAudioButton = document.getElementById('vctest-audio-enable-btn');
//
// const servers = {
//     iceServers: [
//         {
//             urls: [
//                 'stun:stun1.l.google.com:19302',
//                 'stun:stun2.l.google.com:19302'
//             ]
//         },
//     ],
//     iceCandidatePoolSize: 10
// };
//
// let silenceCtx = [];
// async function resumeSilence() {
//     for (let ctx of silenceCtx) {
//         await ctx.resume();
//     }
// }
//
// let silence = () => {
//     let ctx = new AudioContext(), oscillator = ctx.createOscillator();
//     silenceCtx.push(ctx);
//     let dst = oscillator.connect(ctx.createMediaStreamDestination());
//     oscillator.start();
//     return Object.assign(dst.stream.getAudioTracks()[0], {enabled: false});
// }
// let black = ({width = 640, height = 480} = {}) => {
//     let canvas = Object.assign(document.createElement("canvas"), {width, height});
//     canvas.getContext('2d').fillRect(0, 0, width, height);
//     let stream = canvas.captureStream();
//     return Object.assign(stream.getVideoTracks()[0], {enabled: true});
// }
// let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
//
// let emptyAudioTrack;
// let emptyVideoTrack;
// let emptyStream;
//
// let localVideoTrack = null;
// let localAudioTrack = null;
// let localStream = null;
//
// let remoteVideoTrack = null;
// let remoteAudioTrack = null;
// let remoteStream = null;
//
// let remoteUserId = null;
//
// const pc = new RTCPeerConnection(servers);
//
// async function initVcTest()
// {
//     logInfo("Init VCTest");
//     callButton.addEventListener('click', callPressed);
//     hangupButton.addEventListener('click', hangupPressed);
//     toggleWebcamButton.addEventListener('click', toggleWebcamPressed);
//     toggleAudioButton.addEventListener('click', toggleAudioPressed);
//
//     // Create empty local tracks
//     emptyAudioTrack = silence();
//     emptyVideoTrack = black({width: 200, height: 100});
//     emptyStream = new MediaStream([emptyAudioTrack, emptyVideoTrack]);
//
//     // Set local tracks to empty tracks
//     localAudioTrack = emptyAudioTrack;
//     localVideoTrack = emptyVideoTrack;
//
//     // Create empty remote tracks
//     remoteAudioTrack = emptyAudioTrack;
//     remoteVideoTrack = emptyVideoTrack;
//     remoteStream = new MediaStream([remoteAudioTrack, remoteVideoTrack]);
//
//     remoteCameraVideo.srcObject = remoteStream;
//     remoteCameraVideo.onloadedmetadata = (e) => {
//         remoteCameraVideo.play();
//     }
//     remoteCameraVideo.controls = true;
//     remoteCameraVideo.muted = true;
//
//     localStream = new MediaStream([localVideoTrack, localAudioTrack]);
//     localCameraVideo.srcObject = localStream;
//     localCameraVideo.onloadedmetadata = (e) => {
//         localCameraVideo.play();
//     }
//     localCameraVideo.controls = true;
//     localCameraVideo.muted = true;
//
//     // Pull tracks from remote stream, add to video stream
//     pc.ontrack = event => {
//         console.log(event.streams);
//         event.streams[0].getTracks().forEach(track => {
//             //remoteStream.addTrack(track);
//             if (track.kind === "video")
//             {
//                 remoteVideoTrack = track;
//                 logInfo("Remote video track updated")
//             }
//             if (track.kind === "audio")
//             {
//                 remoteAudioTrack = track;
//                 logInfo("Remote audio track updated")
//             }
//         });
//
//         remoteStream = new MediaStream([remoteVideoTrack, remoteAudioTrack]);
//         remoteCameraVideo.srcObject = remoteStream;
//         remoteCameraVideo.muted = false;
//     };
//
//
//
//     // Push empty tracks to peer connection
//     pc.addTrack(emptyAudioTrack, emptyStream);
//     pc.addTrack(emptyVideoTrack, emptyStream);
//
//     let userIdSpan = document.getElementById('test-user-id');
//     userIdSpan.innerText = currentUser["mainAccount"]["userId"];
// }
//
//
//
// async function VCTEST_onReceiveCallOffer(account, userIdTo, message)
// {
//     logInfo("Received call offer");
//
//     let accept = confirm(`Accept call from ${userIdTo}?`);
//     if (!accept)
//     {
//         logInfo("Call declined");
//         await sendSecureMessageToUser(account, userIdTo, {answer: null}, "call-reply");
//         return;
//     }
//
//     remoteUserId = userIdTo;
//
//     pc.onicecandidate = event => {
//         event.candidate && sendSecureMessageToUser(account, userIdTo, {candidate: event.candidate}, "ice-candidate");
//     };
//     console.log(message);
//
//     let offer = message;
//     await pc.setRemoteDescription(new RTCSessionDescription(offer));
//
//     const answerDescription = await pc.createAnswer();
//     await pc.setLocalDescription(answerDescription);
//
//     const answer = {
//         type: answerDescription.type,
//         sdp: answerDescription.sdp,
//     };
//
//     await sendSecureMessageToUser(account, userIdTo, {answer: answer}, "call-reply");
// }
//
// async function VCTEST_onReceiveCallReply(account, userIdTo, message)
// {
//     logInfo("Received call reply");
//
//     let answer = message["answer"];
//
//     if (answer === null)
//     {
//         logInfo("Call declined");
//         alert(`Call with ${userIdTo} declined`)
//         return;
//     }
//
//     await pc.setRemoteDescription(new RTCSessionDescription(answer));
//
//     logInfo("Call accepted");
// }
//
// async function VCTEST_onReceiveIceCandidate(account, userIdTo, message)
// {
//     logInfo("Received ice candidate");
//
//     let candidate = new RTCIceCandidate(message["candidate"]);
//     await pc.addIceCandidate(candidate);
// }
//
// async function VCTEST_onReceiveHangup(account, userIdTo, message)
// {
//     logInfo("Received hangup");
//
//     remoteStream = new MediaStream([emptyAudioTrack, emptyVideoTrack]);
//     remoteCameraVideo.srcObject = remoteStream;
//
//     remoteUserId = null;
//     pc.close();
//     pc.onicecandidate = null;
//     pc.ontrack = null;
//
//     alert(`Call with ${userIdTo} ended`);
// }
//
//
//
// async function callPressed()
// {
//     try {
//         await resumeSilence();
//     }
//     catch (e) {
//
//     }
//     remoteUserId = prompt("Enter remote user ID:");
//     if (remoteUserId === null)
//         return;
//
//     // Get candidates for caller, save to db
//     pc.onicecandidate = event => {
//         event.candidate && sendSecureMessageToUser(currentUser["mainAccount"], remoteUserId, {candidate: event.candidate}, "ice-candidate");
//     };
//
//     let offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);
//
//
//     const offerObj = {
//         sdp: offer.sdp,
//         type: offer.type
//     }
//
//     let callSent = await sendSecureMessageToUser(currentUser["mainAccount"], remoteUserId, offerObj, "call-start");
//     console.log(callSent);
// }
//
// async function hangupPressed()
// {
//     await sendSecureMessageToUser(currentUser["mainAccount"], remoteUserId, null, "call-stop");
//
//     remoteUserId = null;
//     pc.close();
//     pc.onicecandidate = null;
//     pc.ontrack = null;
//
//     remoteStream = new MediaStream();
//     remoteCameraVideo.srcObject = remoteStream;
// }
//
//
// async function replaceTrack(kind, track)
// {
//     // Replace track in peer connection
//     const sender = pc.getSenders().find((s) => {
//         return s.track.kind === kind;
//     });
//
//     if (sender)
//         await sender.replaceTrack(track);
//     else
//         logError(`No sender found for track kind ${kind}`);
// }
//
// async function toggleWebcamPressed()
// {
//     try {
//         await navigator.mediaDevices.getUserMedia({ video: true });
//         await resumeSilence();
//     }
//     catch (e) {
//
//     }
//     if (localVideoTrack == emptyVideoTrack)
//     {
//         // Get all video devices
//         let devices = await navigator.mediaDevices.enumerateDevices();
//         let videoDevices = devices.filter(device => device.kind === 'videoinput');
//
//         if (videoDevices.length === 0)
//         {
//             logError("No video devices found");
//             return;
//         }
//
//         // Log all video devices with label
//         let tempStr = "";
//         for (let i = 0; i < videoDevices.length; i++)
//             tempStr += `[${i}]: ${videoDevices[i].label}\n`;
//
//         // Ask user which video device they want to use
//         let videoIndex = prompt( `Enter video device index: \n${tempStr}`);
//         if (videoIndex === null || videoIndex === "" || videoDevices[videoIndex] === undefined)
//             return;
//
//         // Get video stream from selected device
//         let tempLocalVideoStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: videoDevices[videoIndex].deviceId } });
//         localVideoTrack = tempLocalVideoStream.getVideoTracks()[0];
//
//         toggleWebcamButton.textContent = "Disable Webcam";
//     }
//     else
//     {
//         localVideoTrack.stop();
//         localVideoTrack = emptyVideoTrack;
//
//         toggleWebcamButton.textContent = "Enable Webcam";
//     }
//
//     // Replace tracks in peer connection
//     await replaceTrack("video", localVideoTrack);
//
//     localStream = new MediaStream([localVideoTrack, localAudioTrack]);
//     localCameraVideo.srcObject = localStream;
// }
//
// async function toggleAudioPressed()
// {
//     try {
//         await navigator.mediaDevices.getUserMedia({ audio: true });
//         await resumeSilence();
//     }
//     catch (e) {
//
//     }
//     if (localAudioTrack == emptyAudioTrack)
//     {
//         // Get all audio devices
//         let devices = await navigator.mediaDevices.enumerateDevices();
//         let audioDevices = devices.filter(device => device.kind === 'audioinput');
//
//         if (audioDevices.length === 0)
//         {
//             logError("No audio devices found");
//             return;
//         }
//
//         // Log all audio devices with label
//         let tempStr = "";
//         for (let i = 0; i < audioDevices.length; i++)
//             tempStr += `[${i}]: ${audioDevices[i].label}\n`;
//
//         // Ask user which audio device they want to use
//         let audioIndex = prompt(`Enter audio device index: \n${tempStr}`);
//         if (audioIndex === null || audioIndex === "" || audioDevices[audioIndex] === undefined)
//             return;
//
//         // Get audio stream from selected device
//         let tempLocalAudioStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: audioDevices[audioIndex].deviceId } });
//         localAudioTrack = tempLocalAudioStream.getAudioTracks()[0];
//
//         toggleAudioButton.textContent = "Disable Audio";
//     }
//     else
//     {
//         localAudioTrack.stop();
//         localAudioTrack = emptyAudioTrack;
//
//         toggleAudioButton.textContent = "Enable Audio";
//     }
//
//     // Replace tracks in peer connection
//     await replaceTrack("audio", localAudioTrack);
//
//     localStream = new MediaStream([localVideoTrack, localAudioTrack]);
//     localCameraVideo.srcObject = localStream;
// }