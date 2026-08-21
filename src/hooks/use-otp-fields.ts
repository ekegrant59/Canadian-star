'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

export function useOtpFields(length: number, onComplete: (code: string) => void) {
  const [digits, setDigits] = useState(() => Array.from({ length }, () => ''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const onCompleteRef = useRef(onComplete);
  const submittedCodeRef = useRef('');

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const code = digits.join('');
    if (code.length !== length || code === submittedCodeRef.current) return;
    submittedCodeRef.current = code;
    onCompleteRef.current(code);
  }, [digits, length]);

  const applyDigits = (startIndex: number, value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return;
    submittedCodeRef.current = '';
    setDigits((current) => {
      const next = [...current];
      numbers
        .slice(0, length - startIndex)
        .split('')
        .forEach((digit, offset) => {
          next[startIndex + offset] = digit;
        });
      return next;
    });
    const focusIndex = Math.min(startIndex + numbers.length, length - 1);
    queueMicrotask(() => inputRefs.current[focusIndex]?.focus());
  };

  const handleChange = (index: number, value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length > 1) return applyDigits(index, numbers);
    submittedCodeRef.current = '';
    setDigits((current) =>
      current.map((digit, digitIndex) => (digitIndex === index ? numbers : digit)),
    );
    if (numbers && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    applyDigits(index, event.clipboardData.getData('text'));
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const reset = () => {
    submittedCodeRef.current = '';
    setDigits(Array.from({ length }, () => ''));
    queueMicrotask(() => inputRefs.current[0]?.focus());
  };

  return { digits, setDigits, inputRefs, handleChange, handlePaste, handleKeyDown, reset };
}
