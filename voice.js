// voice.js - Handles all Text-to-Speech using window.speechSynthesis

class VoiceEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentUtterance = null;
        this.currentHighlightedElement = null;
        this.voiceReady = false;
        this.speechQueue = [];
        this.isSpeaking = false;
    }

    // Load and select the best available voice
    async init() {
        return new Promise((resolve) => {
            const loadVoices = () => {
                this.voices = this.synth.getVoices();
                if (this.voices.length) {
                    // Try to find a high-quality GB or US voice
                    this.preferredVoice = 
                        this.voices.find(v => v.lang === 'en-GB' && (v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Female'))) ||
                        this.voices.find(v => v.lang === 'en-US' && (v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Female'))) ||
                        this.voices.find(v => v.lang.startsWith('en-'));
                    
                    console.log("Voice ready. Selected:", this.preferredVoice ? this.preferredVoice.name : 'Default');
                    this.voiceReady = true;
                    resolve();
                }
            };

            if (this.synth.getVoices().length) {
                loadVoices();
            } else {
                this.synth.onvoiceschanged = () => {
                    loadVoices();
                };
            }
        });
    }

    // Main function to speak text
    speak(text, elementToHighlight = null) {
        if (!this.voiceReady || !text) return;

        // If called while speaking, add to queue
        if (this.isSpeaking) {
            this.speechQueue.push({ text, elementToHighlight });
            return;
        }

        this.isSpeaking = true;
        this.synth.cancel(); // Cancel previous speech

        this.currentUtterance = new SpeechSynthesisUtterance(text);
        if (this.preferredVoice) {
            this.currentUtterance.voice = this.preferredVoice;
        }
        this.currentUtterance.pitch = 1;
        this.currentUtterance.rate = 1;

        this.currentHighlightedElement = elementToHighlight;

        // Add highlight on start
        this.currentUtterance.onstart = () => {
            if (this.currentHighlightedElement) {
                this.currentHighlightedElement.classList.add('speaking-highlight');
            }
        };

        // Remove highlight and check queue on end
        this.currentUtterance.onend = () => {
            this.isSpeaking = false;
            if (this.currentHighlightedElement) {
                this.currentHighlightedElement.classList.remove('speaking-highlight');
                this.currentHighlightedElement = null;
            }
            // Check for next item in queue
            this.processQueue();
        };

        this.currentUtterance.onerror = (e) => {
            console.error('Speech synthesis error:', e);
            this.isSpeaking = false;
            this.processQueue(); // Try next item even on error
        };

        this.synth.speak(this.currentUtterance);
    }

    // Speak the next item in the queue
    processQueue() {
        if (this.speechQueue.length > 0) {
            const nextSpeech = this.speechQueue.shift();
            this.speak(nextSpeech.text, nextSpeech.elementToHighlight);
        }
    }

    // Speak all elements with [data-speakable="true"] in a container
    speakScreen(containerElement) {
        if (!containerElement) return;

        this.cancel(); // Clear queue and stop current speech
        this.speechQueue = []; // Clear queue

        const elements = containerElement.querySelectorAll('[data-speakable="true"]');
        elements.forEach(el => {
            // Use aria-label if present (for buttons), otherwise use textContent
            const textToSpeak = el.getAttribute('aria-label') || el.textContent;
            this.speechQueue.push({ text: textToSpeak, elementToHighlight: el });
        });

        this.processQueue(); // Start speaking the first item
    }

    pause() {
        if (this.synth.speaking) {
            this.synth.pause();
        }
    }

    resume() {
        if (this.synth.paused) {
            this.synth.resume();
        }
    }
    
    // Stop speaking and clear the queue
    cancel() {
        this.isSpeaking = false;
        this.speechQueue = [];
        this.synth.cancel();
        if (this.currentHighlightedElement) {
            this.currentHighlightedElement.classList.remove('speaking-highlight');
            this.currentHighlightedElement = null;
        }
    }

    // Replay the last *manually triggered* utterance (not great for queues)
    replayLast() {
        if (this.currentUtterance) {
            this.speak(this.currentUtterance.text, this.currentHighlightedElement);
        }
    }
}
