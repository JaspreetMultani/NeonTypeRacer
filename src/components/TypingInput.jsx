import React from 'react';

export default function TypingInput({ value, onChange, disabled }) {
    return (
        <textarea
            value={value}
            onChange={onChange}
            disabled={disabled}
            rows={3}
            style={{
                width: '600px',
                padding: '1rem',
                fontSize: '1.25rem',
                fontFamily: 'Inter, sans-serif',
            }}
            placeholder="Start typing..."
        />
    );
}
