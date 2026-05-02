const sceneCard = document.getElementById("sceneCard");
const flame = document.getElementById("flame");
const promptText = document.getElementById("promptText");
const meterFill = document.getElementById("meterFill");
const revealCard = document.getElementById("revealCard");

let audioContext;
let analyser;
let microphoneStream;
let dataArray;
let animationFrameId;
let unlocked = false;
let listening = false;

function stopListening() {
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}

	if (microphoneStream) {
		microphoneStream.getTracks().forEach((track) => track.stop());
		microphoneStream = null;
	}

	if (audioContext && audioContext.state !== "closed") {
		audioContext.close();
	}

	audioContext = null;
	analyser = null;
	dataArray = null;
	listening = false;
}

function unlockReveal(source) {
	if (unlocked) {
		return;
	}

	unlocked = true;
	flame.classList.add("off");
	meterFill.style.width = "0%";
	promptText.textContent =
		source === "microphone"
			? "Төрсөн өдрийн мэнд."
			: "Микрофон ажиллахгүй бол ахиад дарж үзээрэй.";

	sceneCard.classList.add("fade-out");
	stopListening();

	window.setTimeout(() => {
		sceneCard.classList.add("hidden");
		revealCard.classList.remove("hidden");
		requestAnimationFrame(() => {
			revealCard.classList.add("visible");
		});
	}, 420);
}

function monitorMicrophone() {
	if (!analyser || !dataArray || unlocked) {
		return;
	}

	analyser.getByteFrequencyData(dataArray);
	const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
	const percent = Math.min(100, Math.round((average / 110) * 100));
	meterFill.style.width = `${percent}%`;

	if (average > 52) {
		unlockReveal("microphone");
		return;
	}

	animationFrameId = requestAnimationFrame(monitorMicrophone);
}

async function startListening() {
	if (listening || unlocked) {
		return;
	}

	if (!navigator.mediaDevices?.getUserMedia) {
		promptText.textContent = "Микрофон дэмжихгүй байна. Дахин дарж оролдоорой.";
		return;
	}

	try {
		listening = true;
		promptText.textContent = "Одоо үлээгээрэй.";

		microphoneStream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true
			}
		});

		audioContext = new AudioContext();
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 256;
		dataArray = new Uint8Array(analyser.frequencyBinCount);

		const source = audioContext.createMediaStreamSource(microphoneStream);
		source.connect(analyser);
		monitorMicrophone();
	} catch (error) {
		listening = false;
		promptText.textContent = "Микрофоны зөвшөөрөл хэрэгтэй. Дахин дарна уу.";
	}
}

sceneCard.addEventListener("click", startListening);
window.addEventListener("beforeunload", stopListening);