const startCard = document.getElementById("startCard");
const startButton = document.getElementById("startButton");
const sceneCard = document.getElementById("sceneCard");
const flame = document.getElementById("flame");
const promptText = document.getElementById("promptText");
const meterFill = document.getElementById("meterFill");
const revealCard = document.getElementById("revealCard");
const sliderTrack = document.getElementById("sliderTrack");
const sliderDots = Array.from(document.querySelectorAll(".slider-dot"));

let audioContext;
let analyser;
let microphoneStream;
let dataArray;
let animationFrameId;
let sliderIntervalId;
let currentSlide = 0;
let unlocked = false;
let listening = false;

function showSceneCard() {
	startCard.classList.add("fade-out");
	window.setTimeout(() => {
		startCard.classList.add("hidden");
		sceneCard.classList.remove("hidden");
	}, 260);
}

function renderSlide(index) {
	currentSlide = index;
	sliderTrack.style.transform = `translateX(-${index * 100}%)`;
	sliderDots.forEach((dot, dotIndex) => {
		dot.classList.toggle("active", dotIndex === index);
	});
}

function startSlider() {
	if (sliderIntervalId || sliderDots.length === 0) {
		return;
	}

	sliderIntervalId = window.setInterval(() => {
		const nextIndex = (currentSlide + 1) % sliderDots.length;
		renderSlide(nextIndex);
	}, 2800);
}

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
		renderSlide(0);
		requestAnimationFrame(() => {
			revealCard.classList.add("visible");
			window.setTimeout(startSlider, 1800);
		});
	}, 920);
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

startButton.addEventListener("click", async () => {
	showSceneCard();
	window.setTimeout(() => {
		startListening();
	}, 180);
});

sliderDots.forEach((dot) => {
	dot.addEventListener("click", () => {
		renderSlide(Number(dot.dataset.slide));
	});
});
window.unlockReveal = unlockReveal;
window.addEventListener("beforeunload", stopListening);