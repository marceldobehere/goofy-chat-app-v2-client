const localVideo = document.getElementById('vctest-local-video');
const remoteVideo = document.getElementById('vctest-remote-video');

const callButton = document.getElementById('vctest-call-btn');
const hangupButton = document.getElementById('vctest-hang-up-btn');

const toggleWebcamButton = document.getElementById('vctest-webcam-enable-btn');
const toggleAudioButton = document.getElementById('vctest-audio-enable-btn');

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

let silence = () => {
    let ctx = new AudioContext(), oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    return Object.assign(dst.stream.getAudioTracks()[0], {enabled: false});
}
let black = ({width = 640, height = 480} = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {width, height});
    canvas.getContext('2d').fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], {enabled: false});
}
let blackSilence = (...args) => new MediaStream([black(...args), silence()]);

let emptyAudioTrack;
let emptyVideoTrack;
let emptyStream;

let localVideoTrack = null;
let localAudioTrack = null;
let localStream = null;

let remoteVideoTrack = null;
let remoteAudioTrack = null;
let remoteStream = null;

let remoteUserId = null;

const pc = new RTCPeerConnection(servers);

async function initVcTest()
{
    logInfo("Init VCTest");
    callButton.addEventListener('click', callPressed);
    hangupButton.addEventListener('click', hangupPressed);
    toggleWebcamButton.addEventListener('click', toggleWebcamPressed);
    toggleAudioButton.addEventListener('click', toggleAudioPressed);


    remoteStream = blackSilence({width: 640, height: 480});
    remoteVideo.srcObject = remoteStream;
    remoteVideo.onloadedmetadata = (e) => {
        remoteVideo.play();
    }

    localStream = blackSilence({width: 640, height: 480});
    localVideo.srcObject = localStream;
    localVideo.onloadedmetadata = (e) => {
        localVideo.play();
    }

    // Pull tracks from remote stream, add to video stream
    pc.ontrack = event => {
        event.streams[0].getTracks().forEach(track => {
            //remoteStream.addTrack(track);
            if (track.kind === "video")
                remoteVideo.srcObject = event.streams[0];
            if (track.kind === "audio")
                remoteAudioTrack = track;
        });

        remoteStream = new MediaStream([remoteVideoTrack, remoteAudioTrack]);
        remoteVideo.srcObject = remoteStream;
    };

    // Create empty tracks
    emptyAudioTrack = silence();
    emptyVideoTrack = black({width: 640, height: 480});
    emptyStream = new MediaStream([emptyAudioTrack, emptyVideoTrack]);

    // Set local tracks to empty tracks
    localAudioTrack = emptyAudioTrack;
    localVideoTrack = emptyVideoTrack;

    // Push empty tracks to peer connection
    pc.addTrack(emptyAudioTrack, emptyStream);
    pc.addTrack(emptyVideoTrack, emptyStream);
}



async function VCTEST_onReceiveCallOffer(account, userIdTo, message)
{
    logInfo("Received call offer");

    let accept = confirm(`Accept call from ${userIdTo}?`);
    if (!accept)
    {
        logInfo("Call declined");
        await sendSecureMessageToUser(account, userIdTo, {answer: null}, "call-reply");
        return;
    }

    remoteUserId = userIdTo;

    pc.onicecandidate = event => {
        event.candidate && sendSecureMessageToUser(account, userIdTo, {candidate: event.candidate}, "ice-candidate");
    };
    console.log(message);

    let offer = message;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    };

    await sendSecureMessageToUser(account, userIdTo, {answer: answer}, "call-reply");
}

async function VCTEST_onReceiveCallReply(account, userIdTo, message)
{
    logInfo("Received call reply");

    let answer = message["answer"];

    if (answer === null)
    {
        logInfo("Call declined");
        return;
    }

    await pc.setRemoteDescription(new RTCSessionDescription(answer));

    logInfo("Call accepted");
}

async function VCTEST_onReceiveIceCandidate(account, userIdTo, message)
{
    logInfo("Received ice candidate");

    let candidate = new RTCIceCandidate(message["candidate"]);
    await pc.addIceCandidate(candidate);
}

async function VCTEST_onReceiveHangup(account, userIdTo, message)
{
    logInfo("Received hangup");

    remoteStream = new MediaStream([emptyAudioTrack, emptyVideoTrack]);
    remoteVideo.srcObject = remoteStream;

    remoteUserId = null;
    pc.close();
    pc.onicecandidate = null;
    pc.ontrack = null;



}



async function callPressed()
{
    remoteUserId = prompt("Enter remote user ID:");
    if (remoteUserId === null)
        return;

    // Get candidates for caller, save to db
    pc.onicecandidate = event => {
        event.candidate && sendSecureMessageToUser(currentUser["mainAccount"], remoteUserId, {candidate: event.candidate}, "ice-candidate");
    };

    let offer = await pc.createOffer();
    await pc.setLocalDescription(offer);


    const offerObj = {
        sdp: offer.sdp,
        type: offer.type
    }

    let callSent = await sendSecureMessageToUser(currentUser["mainAccount"], remoteUserId, offerObj, "call-start");
    console.log(callSent);
}

async function hangupPressed()
{
    await sendSecureMessageToUser(currentUser["mainAccount"], remoteUserId, null, "call-stop");

    remoteUserId = null;
    pc.close();
    pc.onicecandidate = null;
    pc.ontrack = null;

    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
}


async function replaceTrack(kind, track)
{
    // Replace track in peer connection
    const sender = pc.getSenders().find((s) => {
        return s.track.kind === kind;
    });

    if (sender)
        await sender.replaceTrack(track);
    else
        logError(`No sender found for track kind ${kind}`);
}

async function toggleWebcamPressed()
{
    try {
        await navigator.mediaDevices.getUserMedia({ video: true });
    }
    catch (e) {

    }
    if (localVideoTrack == emptyVideoTrack)
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
        let tempLocalVideoStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: videoDevices[videoIndex].deviceId }, audio: true });
        localVideoTrack = tempLocalVideoStream.getVideoTracks()[0];
    }
    else
    {
        localVideoTrack.stop();
        localVideoTrack = emptyVideoTrack;
    }

    // Replace tracks in peer connection
    await replaceTrack("video", localVideoTrack);

    localStream = new MediaStream([localVideoTrack, localAudioTrack]);
    localVideo.srcObject = localStream;
}

async function toggleAudioPressed()
{
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    catch (e) {

    }
    if (localAudioTrack == emptyAudioTrack)
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
        let tempLocalAudioStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: audioDevices[audioIndex].deviceId } });
        localAudioTrack = tempLocalAudioStream.getAudioTracks()[0];
    }
    else
    {
        localAudioTrack.stop();
        localAudioTrack = emptyAudioTrack;
    }

    // Replace tracks in peer connection
    await replaceTrack("audio", localAudioTrack);

    localStream = new MediaStream([localVideoTrack, localAudioTrack]);
    localVideo.srcObject = localStream;
}