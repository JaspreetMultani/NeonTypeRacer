import React from 'react';

export default function Stats({ wpm, accuracy, onReset }) {
    return (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <p>WPM: {wpm}</p>
            <p>Accuracy: {accuracy}%</p>
            <button onClick={onReset} style={{ marginTop: '1rem' }}>
                Try Again
            </button>
        </div>
    );
}
