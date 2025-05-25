import React from 'react';

export default function TypingPrompt({ text, userInput }) {
    return (
        <p style={{ maxWidth: '600px', lineHeight: 1.5, marginBottom: '1rem' }}>
            {[...text].map((char, i) => {
                let color = 'inherit';
                if (i < userInput.length) {
                    color = userInput[i] === char ? '#6aef6a' : '#ef6a6a';
                }
                return <span key={i} style={{ color }}>{char}</span>;
            })}
        </p>
    );
}
