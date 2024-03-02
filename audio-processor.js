const toggleAudio = document.getElementById("toggle-audio");

let essentia = null;

// audio globals
let micStream;
let AudioContext;
let audioCtx;
let mic;
let gain;
let essentiaProcessorNode;
let soundFile = document.getElementById("audioPlayer");

//send for sketch
let features;
let audioIsProcessing = false;


function start() {
    toggleAudio.disabled = true;
    audioIsProcessing = true;

    requestMicAccess()
        .then(startAudioProcessing)
        .then(function onAudioStart() {
            // set button to stop
            toggleAudio.classList.toggle("recording");
            toggleAudio.innerHTML = "Stop recording";
            toggleAudio.disabled = false;

            //soundFile.play();
        })
        .catch(err => {
            if (err.name == "NotAllowedError") {
                alert("Could not access microphone - Please allow microphone access for this site");
            } else {
                alert(err);
                console.log("Exception name: ", err.name);
                throw err;
            }
        });


}

async function requestMicAccess() {
    console.log("Initializing mic stream...");

    let micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return micStream;
}

function startAudioProcessing(stream) {
    micStream = stream;

    if (!micStream.active) {
        throw "Mic stream not active";
    }

    if (audioCtx.state == "closed") {
        audioCtx = new AudioContext();
    } else if (audioCtx.state == "suspended") {
        audioCtx.resume();
    }

    mic = audioCtx.createMediaStreamSource(micStream);
    console.log(mic)

    essentiaProcessorNode = audioCtx.createScriptProcessor(512);
    essentiaProcessorNode.onaudioprocess = essentiaProcessor;

    gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);

    mic.connect(essentiaProcessorNode);
    essentiaProcessorNode.connect(gain);
    gain.connect(audioCtx.destination);

}


function essentiaProcessor(audioProcessingEvent) {
    const inputBuffer = audioProcessingEvent.inputBuffer;

    const inputData = inputBuffer.getChannelData(0);

    const audioVector = essentia.arrayToVector(inputData);

    const rmsValue = essentia.RMS(audioVector).rms;
    const spectrumValues = essentia.vectorToArray(essentia.Spectrum(audioVector).spectrum);
    const mfccValues = essentia.vectorToArray(essentia.MFCC(audioVector).mfcc);
    const energyValue = essentia.Energy(audioVector).energy;
    //const chromaValues = essentia.vectorToArray(essentia.Chromagram(audioVector).)


    // clean up
    audioVector.delete();

    audioFeatureData['rms'] = rmsValue;
    audioFeatureData['spectrum'] = spectrumValues;
    audioFeatureData['mfcc'] = mfccValues;
    audioFeatureData['energy'] = energyValue;
    //audioFeatureData['time'] = soundFile.currentTime;
    //audioFeatureData['frequency'] = frequencyValues;

    //let displayedTime = formatAudioTime(soundFile.currentTime);


    features = {
        //Time: displayedTime,

        RMS: rmsValue,
        MFCC_0: mfccValues[0],
        MFCC_3: mfccValues[3],
        MFCC_6: mfccValues[6],
        MFCC_9: mfccValues[9],

        Spectrum_0: spectrumValues[0],
        Spectrum_50: spectrumValues[50],
        Spectrum_100: spectrumValues[100],
        Spectrum_150: spectrumValues[150],
        Spectrum_200: spectrumValues[200],
        Spectrum_250: spectrumValues[250],

        Energy: energyValue,
        // Frequency_400: frequencyValues[7],
        // Frequency_1270: frequencyValues[13],
        // Frequency_4400: frequencyValues[21],
        // Frequency_15500: frequencyValues[27],
    }

    displayResults(features);

}

function formatAudioTime(time) {

    let sec = Math.floor(time) % 60;

    let displayedTimeSec = "";
    if (sec < 10) {
        displayedTimeSec = "0".concat(sec);
    } else {
        displayedTimeSec = sec.toString();
    }

    let min = Math.floor(time / 60);
    let displayedTimeMin = "";
    if (min >= 1) {
        displayedTimeMin = min.toString();
    } else {
        displayedTimeMin = "0"
    }

    let displayedTime = "";
    displayedTime = displayedTimeMin.concat(":").concat(displayedTimeSec);
    return (displayedTime);

}

function displayResults(features) {
    const display = document.querySelector("#activation-display");
    display.innerHTML = `<pre>${JSON.stringify(features, null, 4)}</pre>`;

}


function stop() {
    // stop mic stream
    micStream.getAudioTracks().forEach(function (track) {
        track.stop();
        micStream.removeTrack(track);
    });

    audioIsProcessing = true;

    console.log("Stopped mic stream ...");

    audioCtx.close().then(function resetState() {
        // manage button state
        toggleAudio.classList.toggle("recording");
        toggleAudio.innerHTML = "Start recording";

        // disconnect nodes
        mic.disconnect();
        essentiaProcessorNode.disconnect();
        gain.disconnect();
        mic = null;
        essentiaProcessorNode = null;
        gain = null;

        //soundFile.pause();
    });


}

function toggleAudioHandler() {

    let isRecording = this.classList.contains("recording");
    if (!isRecording) {
        start();
    } else {
        stop();
    }
}

let audioFeatureData = {};

function setupEssentia() {
    AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    // load Essentia.js
    toggleAudio.disabled = true;
    EssentiaWASM().then(wasmModule => {
        essentia = new Essentia(wasmModule, false);
        toggleAudio.disabled = false;
    })

    toggleAudio.addEventListener("click", toggleAudioHandler);
}

setupEssentia();

export { features, audioFeatureData, audioIsProcessing };