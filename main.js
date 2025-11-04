// main.js - Core Application Logic

document.addEventListener('DOMContentLoaded', () => {
    
    // --- State & DOM Elements ---
    const stages = document.querySelectorAll('.stage');
    const totalStages = stages.length;
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const progressBar = document.getElementById('progress-bar');
    const appContainer = document.getElementById('app-container');
    const audioControls = {
        pause: document.getElementById('pause-speech-btn'),
        replay: document.getElementById('replay-speech-btn')
    };
    
    let currentStage = 0;
    let touchStartX = 0;
    let touchEndX = 0;
    let isPaused = false;

    // Initialize Voice Engine
    const voice = new VoiceEngine();
    voice.init();

    // --- Navigation ---
    
    function goToStage(stageIndex) {
        if (stageIndex < 0 || stageIndex >= totalStages) return;

        // Hide current stage
        if (stages[currentStage]) {
            stages[currentStage].classList.remove('active');
        }

        // Show new stage
        currentStage = stageIndex;
        stages[currentStage].classList.add('active');

        // Stop any previous speech and speak the new screen
        voice.cancel();
        setTimeout(() => { // Give stage time to render
            voice.speakScreen(stages[currentStage]);
        }, 300); // 300ms for transition

        updateNavigation();
        saveProgress();
        
        // Trigger stage-specific logic
        if (currentStage === 7) {
            playConfetti();
        }
    }

    function updateNavigation() {
        // Update Progress Bar
        progressBar.style.width = `${((currentStage) / (totalStages - 1)) * 100}%`;

        // Update Buttons
        backBtn.disabled = (currentStage === 0);
        nextBtn.disabled = (currentStage === totalStages - 1);
    }
    
    nextBtn.addEventListener('click', () => goToStage(currentStage + 1));
    backBtn.addEventListener('click', () => goToStage(currentStage - 1));

    // --- Swipe Navigation ---
    appContainer.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    appContainer.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50; // Minimum pixels for a swipe
        if (touchEndX < touchStartX - swipeThreshold) {
            goToStage(currentStage + 1); // Swiped left
        } else if (touchEndX > touchStartX + swipeThreshold) {
            goToStage(currentStage - 1); // Swiped right
        }
    }

    // --- Audio Controls ---
    audioControls.pause.addEventListener('click', () => {
        if (isPaused) {
            voice.resume();
            audioControls.pause.textContent = "Pause Audio ⏸️";
        } else {
            voice.pause();
            audioControls.pause.textContent = "Resume Audio ▶️";
        }
        isPaused = !isPaused;
    });
    
    audioControls.replay.addEventListener('click', () => {
        voice.cancel();
        voice.speakScreen(stages[currentStage]);
    });

    // --- Progress Saving ---
    function saveProgress() {
        localStorage.setItem('grammarAppProgress', currentStage);
    }

    function loadProgress() {
        const savedStage = localStorage.getItem('grammarAppProgress');
        if (savedStage) {
            goToStage(parseInt(savedStage, 10));
        } else {
            goToStage(0); // Start at welcome screen
        }
    }

    // --- Stage-Specific Logic ---
    
    // Stage 0: Welcome
    document.getElementById('start-btn').addEventListener('click', () => goToStage(1));

    // Stage 1: Learn Relative Clauses
    const interactiveWords = document.querySelectorAll('[data-interactive="true"]');
    const feedback1 = document.getElementById('feedback-stage-1');
    interactiveWords.forEach(word => {
        word.addEventListener('click', () => {
            if (word.dataset.correct === 'true') {
                showFeedback(feedback1, "Correct! That’s your relative pronoun.", 'success');
                word.style.pointerEvents = 'none'; // Disable after correct
            }
        });
    });

    // Stage 2 & 4: Drag and Drop Logic
    let draggedItem = null;

    appContainer.addEventListener('dragstart', e => {
        if (e.target.classList.contains('word-chip')) {
            draggedItem = e.target;
            setTimeout(() => e.target.style.opacity = '0.5', 0);
        }
    });

    appContainer.addEventListener('dragend', e => {
        if (draggedItem) {
            setTimeout(() => e.target.style.opacity = '1', 0);
            draggedItem = null;
        }
    });

    appContainer.addEventListener('dragover', e => {
        e.preventDefault(); // Necessary to allow dropping
        if (e.target.classList.contains('drop-zone')) {
            e.target.classList.add('drag-over');
        }
    });

    appContainer.addEventListener('dragleave', e => {
        if (e.target.classList.contains('drop-zone')) {
            e.target.classList.remove('drag-over');
        }
    });

    appContainer.addEventListener('drop', e => {
        e.preventDefault();
        if (e.target.classList.contains('drop-zone')) {
            e.target.classList.remove('drag-over');
            
            // --- Stage 2 Logic ---
            if (e.target.id === 'rc-drop-1') {
                const correctWord = e.target.dataset.correctWord;
                if (draggedItem && draggedItem.dataset.word === correctWord) {
                    e.target.innerHTML = ''; // Clear dropzone
                    e.target.appendChild(draggedItem);
                    draggedItem.draggable = false;
                    draggedItem.classList.add('disabled');
                    document.getElementById('rc-combined-1').style.display = 'block';
                    showFeedback('feedback-stage-2', "Perfect! You combined them.", 'success');
                } else {
                    showFeedback('feedback-stage-2', "Not quite. Try a different word.", 'error');
                }
            }
            
            // --- Stage 4 Logic ---
            if (e.target.id === 'inv-dropzone') {
                e.target.appendChild(draggedItem);
                draggedItem.style.opacity = '1';
            }
        }
    });
    
    // Stage 4: Check Inversion
    document.getElementById('check-inversion-btn').addEventListener('click', () => {
        const dropzone = document.getElementById('inv-dropzone');
        const chips = dropzone.querySelectorAll('.word-chip');
        const answer = Array.from(chips).map(chip => chip.textContent).join(' ');
        const correctAnswer = dropzone.dataset.correctAnswer;
        
        if (answer === correctAnswer) {
            showFeedback('feedback-stage-4', "Beautiful inversion! That's correct.", 'success');
        } else {
            showFeedback('feedback-stage-4', "Try rearranging again. Remember: [Adverb] [Aux] [Subject] [Verb]...", 'error');
        }
    });

    // Stage 6: Check Mission
    document.getElementById('check-mission-btn').addEventListener('click', () => {
        const selects = {
            inversion: document.getElementById('select-inversion'),
            relative: document.getElementById('select-relative'),
            parallel: document.getElementById('select-parallel'),
        };
        
        let checksPassed = 0;
        let errors = [];

        if (selects.inversion.value && selects.inversion.selectedOptions[0].dataset.rule) checksPassed++;
        else errors.push("inversion");

        if (selects.relative.value && selects.relative.selectedOptions[0].dataset.rule) checksPassed++;
        else errors.push("a relative clause");

        if (selects.parallel.value && selects.parallel.selectedOptions[0].dataset.rule) checksPassed++;
        else errors.push("parallelism");
        
        const missionText = `${selects.inversion.value} ${selects.relative.value} ${selects.parallel.value}.`;
        const missionOutput = document.getElementById('final-mission-output');
        missionOutput.textContent = missionText;

        if (checksPassed === 3) {
            showFeedback('mission-feedback', "Fantastic! Your mission statement uses all three structures.", 'success');
            voice.speak(missionText, missionOutput);
            playConfetti();
        } else {
            showFeedback('mission-feedback', `It's a good start, but you're missing ${errors.join(', ')}. Try again.`, 'error');
        }
    });

    // Stage 7: Reflection & Final Nav
    document.getElementById('replay-btn').addEventListener('click', () => goToStage(0));
    // Note: 'homework-btn' and 'record-btn' are placeholders for more complex logic
    // like saving to a server or using the MediaRecorder API.
    setupMediaRecorder();


    // --- Helper Functions ---
    
    function showFeedback(elementIdOrEl, message, type) {
        const el = (typeof elementIdOrEl === 'string') ? document.getElementById(elementIdOrEl) : elementIdOrEl;
        if (!el) return;
        
        el.textContent = message;
        el.className = `feedback ${type}`; // 'success' or 'error'
        voice.speak(message, el);
    }

    function playConfetti() {
        const container = document.getElementById('confetti-container') || document.body;
        container.innerHTML = ''; // Clear old confetti
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.backgroundColor = Math.random() > 0.5 ? 'var(--primary-gold)' : 'var(--primary-blue)';
            confetti.style.animationDelay = `${Math.random() * 2}s`;
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            container.appendChild(confetti);
        }
        
        // Clean up confetti after animation
        setTimeout(() => container.innerHTML = '', 5000);
    }
    
    function setupMediaRecorder() {
        const recordBtn = document.getElementById('record-btn');
        const statusEl = document.getElementById('record-status');
        let mediaRecorder;
        let chunks = [];
        let isRecording = false;

        recordBtn.addEventListener('click', async () => {
            if (isRecording) {
                // Stop recording
                mediaRecorder.stop();
                isRecording = false;
                recordBtn.textContent = "Record Answer 🎤";
                recordBtn.style.background = '';
                statusEl.textContent = "Recording stopped. (Data not saved in this demo)";
            } else {
                // Start recording
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.ondataavailable = e => chunks.push(e.data);
                    
                    mediaRecorder.onstop = () => {
                        // In a real app, you'd upload this blob
                        // const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
                        chunks = [];
                        stream.getTracks().forEach(track => track.stop()); // Stop mic access
                    };
                    
                    mediaRecorder.start();
                    isRecording = true;
                    recordBtn.textContent = "Stop Recording ⏹️";
                    recordBtn.style.background = 'var(--error)';
                    statusEl.textContent = "Recording... speak now.";
                    voice.speak("Recording started.", statusEl);
                    
                } catch (err) {
                    console.error('Error accessing microphone:', err);
                    statusEl.textContent = "Could not access microphone.";
                    voice.speak("Error. Could not access microphone.", statusEl);
                }
            }
        });
    }

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => console.log('ServiceWorker registration successful:', registration.scope))
                .catch(err => console.log('ServiceWorker registration failed:', err));
        });
    }

    // --- Initial Load ---
    loadProgress();
});
