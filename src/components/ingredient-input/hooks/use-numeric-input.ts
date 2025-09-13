import { useCallback } from 'react';

interface UseNumericInputProps {
  value: string | number | null;
  onChange: (value: string) => void;
  min?: number;
  step?: number;
}

export function useNumericInput({ value, onChange, min = 0 }: UseNumericInputProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;

    // Always allow essential editing and navigation keys
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];

    // Allow Ctrl/Cmd shortcuts for copy/paste/select all
    if (e.ctrlKey || e.metaKey) {
      const shortcuts = ['a', 'c', 'v', 'x', 'z', 'y'];
      if (shortcuts.includes(key.toLowerCase())) {
        return; // Allow these shortcuts
      }
    }

    // Allow the explicitly allowed keys
    if (allowedKeys.includes(key)) {
      return;
    }

    // Allow digits 0-9
    if (/^[0-9]$/.test(key)) {
      return;
    }

    // Allow decimal separators (period and comma) - but prevent duplicates
    if (key === '.' || key === ',') {
      const target = e.target as HTMLInputElement;
      const currentValue = target.value;

      // Prevent multiple decimal separators
      if (currentValue.includes('.') || currentValue.includes(',')) {
        e.preventDefault();
        return;
      }
      return; // Allow single decimal separator
    }

    // Allow scientific notation (e/E) for advanced users
    if (key === 'e' || key === 'E') {
      const target = e.target as HTMLInputElement;
      const currentValue = target.value;

      // Only allow if there's already a number and no existing e/E
      if (currentValue && !/[eE]/.test(currentValue) && /[0-9]/.test(currentValue)) {
        return;
      }
      e.preventDefault();
      return;
    }

    // Block all other keys
    e.preventDefault();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Replace comma with period for decimal consistency
    inputValue = inputValue.replace(',', '.');

    // Remove multiple decimal points (keep only the first one)
    const decimalMatches = inputValue.match(/\./g);
    if (decimalMatches && decimalMatches.length > 1) {
      const firstDecimalIndex = inputValue.indexOf('.');
      inputValue = inputValue.substring(0, firstDecimalIndex + 1) +
                  inputValue.substring(firstDecimalIndex + 1).replace(/\./g, '');
    }

    // Remove invalid characters but preserve valid decimal numbers
    inputValue = inputValue.replace(/[^0-9.eE+-]/g, '');

    // Handle edge cases
    if (inputValue === '' || inputValue === '0' || inputValue === '0.') {
      onChange(inputValue);
      return;
    }

    // Validate the number format
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      // If it's not a valid number, only keep it if it's in process of being typed
      if (/^[0-9]*\.?[0-9]*[eE]?[+-]?[0-9]*$/.test(inputValue)) {
        onChange(inputValue);
      }
      return;
    }

    // Apply minimum constraint during typing (if specified)
    if (min !== undefined && numValue < min && inputValue !== '' && !inputValue.endsWith('.')) {
      return; // Don't update if below minimum
    }

    onChange(inputValue);
  }, [min, onChange]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.trim();

    // Handle empty or invalid input
    if (inputValue === '' || inputValue === '0' || inputValue === '.') {
      onChange('');
      return;
    }

    // Parse and validate final value
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      onChange('');
      return;
    }

    // Apply minimum constraint
    if (min !== undefined && numValue < min) {
      onChange('');
      return;
    }

    // Format the final number (remove trailing zeros, ensure valid decimal format)
    const formattedValue = numValue.toString();
    onChange(formattedValue);
  }, [min, onChange]);

  // Convert value to string for display
  const displayValue = value === null || value === undefined ? '' : value.toString();

  return {
    value: displayValue,
    onKeyDown: handleKeyDown,
    onChange: handleChange,
    onBlur: handleBlur
  };
}