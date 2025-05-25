const quotes = [
    "The only way to do great work is to love what you do.",
    "Innovation distinguishes between a leader and a follower.",
    "Stay hungry, stay foolish.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "The best way to predict the future is to create it.",
    "Life is what happens when you're busy making other plans.",
    "The journey of a thousand miles begins with one step.",
    "Be the change you wish to see in the world.",
    "Everything you've ever wanted is on the other side of fear."
];

const paragraphs = [
    "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the English alphabet at least once. Pangrams are sentences that contain every letter of the alphabet, and they are frequently used to display font samples and test keyboards and printers.",
    "Programming is the art of telling another human being what one wants the computer to do. It requires logical thinking, problem-solving skills, and attention to detail. Good programmers write code that humans can understand.",
    "Technology is best when it brings people together. The internet has revolutionized the way we communicate, work, and live. It has made the world smaller and more connected than ever before. However, we must use it wisely and responsibly.",
];

const commonWords = [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
    "time", "use", "will", "way", "about", "many", "then", "them", "write",
    "would", "like", "so", "these", "her", "long", "make", "thing", "see",
    "him", "two", "has", "look", "more", "day", "could", "go", "come", "did",
    "number", "sound", "no", "most", "people", "my", "over", "know", "water",
    "than", "call", "first", "who", "may", "down", "side", "been", "now",
    "find", "any", "new", "work", "part", "take", "get", "place", "made",
    "live", "where", "after", "back", "little", "only", "round", "man", "year",
    "came", "show", "every", "good", "me", "give", "our", "under", "name",
    "very", "through", "just", "form", "sentence", "great", "think", "help"
];

class TextGenerator {
    constructor() {
        this.wordQueue = [];
        this.currentLineWords = [];
        this.wordsPerLine = 9; // Adjust this for longer/shorter lines
        this.minQueueSize = 50; // Keep a buffer of words
    }

    getRandomWord() {
        return commonWords[Math.floor(Math.random() * commonWords.length)];
    }

    generateWords(count) {
        const words = [];
        for (let i = 0; i < count; i++) {
            words.push(this.getRandomWord());
        }
        return words;
    }

    ensureQueueSize() {
        while (this.wordQueue.length < this.minQueueSize) {
            this.wordQueue.push(...this.generateWords(this.minQueueSize));
        }
    }

    getNextLine() {
        this.ensureQueueSize();
        const words = this.wordQueue.splice(0, this.wordsPerLine);
        this.currentLineWords = words;
        return words.join(' ');
    }

    getCurrentLine() {
        return this.currentLineWords.join(' ');
    }

    getWordsTyped(input) {
        const inputWords = input.trim().split(/\s+/);
        return inputWords[inputWords.length - 1] === '' ? inputWords.length - 1 : inputWords.length;
    }

    isLineCompleted(input) {
        const inputWords = input.trim().split(/\s+/);
        return inputWords.length >= this.currentLineWords.length &&
            inputWords[this.currentLineWords.length - 1] === this.currentLineWords[this.currentLineWords.length - 1];
    }
}

export const textGenerator = new TextGenerator();

export const createQuote = () => {
    // 70% chance of getting a quote, 30% chance of getting a paragraph
    const useQuote = Math.random() < 0.7;
    const sourceArray = useQuote ? quotes : paragraphs;
    return sourceArray[Math.floor(Math.random() * sourceArray.length)];
};

export const generateWordList = (count) => {
    const commonWords = [
        "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
        "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
        "this", "but", "his", "by", "from", "they", "we", "say", "her", "she"
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(commonWords[Math.floor(Math.random() * commonWords.length)]);
    }
    return result.join(" ");
}; 