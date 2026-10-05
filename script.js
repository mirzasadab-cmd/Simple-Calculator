document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const display = document.getElementById('display');
  const previousDisplay = document.getElementById('previous-display');
  const btnClear = document.getElementById('btn-clear');
  const btnBackspace = document.getElementById('btn-backspace');
  const btnEquals = document.getElementById('btn-equals');
  const btnDecimal = document.getElementById('btn-decimal');
  const numberButtons = document.querySelectorAll('[data-number]');
  const operatorButtons = document.querySelectorAll('[data-operator]');

  // Calculator State
  let currentExpression = '';
  let isResultDisplayed = false;
  let isErrorDisplayed = false;

  function tokenize(expr) {
    const normalized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\s+/g, ''); 

    if (!normalized) {
      throw new Error('Empty expression');
    }

    const tokens = [];
    let numBuffer = '';

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      if ((char >= '0' && char <= '9') || char === '.') {
        numBuffer += char;
      } else if (['+', '-', '*', '/'].includes(char)) {
        const isUnaryMinus = (char === '-') && (
          numBuffer === '' && (tokens.length === 0 || ['+', '-', '*', '/'].includes(tokens[tokens.length - 1]))
        );

        if (isUnaryMinus) {
          numBuffer = '-';
        } else {
          if (numBuffer !== '') {
            if (numBuffer === '-' || numBuffer.split('.').length > 2) {
              throw new Error('Invalid number');
            }
            tokens.push(parseFloat(numBuffer));
            numBuffer = '';
          } else if (tokens.length === 0) {
            if (char === '+') {
              continue; 
            }
            throw new Error('Invalid expression start');
          }
          tokens.push(char);
        }
      } else {
        throw new Error('Invalid character');
      }
    }

    // Flush remaining number buffer
    if (numBuffer !== '') {
      if (numBuffer === '-' || numBuffer.split('.').length > 2) {
        throw new Error('Invalid number');
      }
      tokens.push(parseFloat(numBuffer));
    }

    return tokens;
  }

  function validateTokens(tokens) {
    if (!tokens || tokens.length === 0) {
      throw new Error('Empty expression');
    }
    const lastToken = tokens[tokens.length - 1];
    if (typeof lastToken === 'string') {
      throw new Error('Incomplete expression');
    }

    if (typeof tokens[0] !== 'number' || isNaN(tokens[0])) {
      throw new Error('Invalid starting token');
    }

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        if (typeof tokens[i] !== 'number' || isNaN(tokens[i])) {
          throw new Error('Invalid expression structure');
        }
      } else {
        if (!['+', '-', '*', '/'].includes(tokens[i])) {
          throw new Error('Invalid operator sequence');
        }
      }
    }
  }

  function evaluateTokens(tokensList) {
    const tokens = [...tokensList];

    // Pass 1: Multiplication and Division 
    let i = 0;
    while (i < tokens.length) {
      const op = tokens[i];
      if (op === '*' || op === '/') {
        const left = tokens[i - 1];
        const right = tokens[i + 1];

        if (op === '/') {
          if (right === 0 || Math.abs(right) < 1e-15) {
            throw new Error('Cannot divide by zero');
          }
          const res = left / right;
          tokens.splice(i - 1, 3, res);
          i = i - 1;
        } else {
          const res = left * right;
          tokens.splice(i - 1, 3, res);
          i = i - 1;
        }
      } else {
        i++;
      }
    }

    // Pass 2: Addition and Subtraction
    i = 0;
    while (i < tokens.length) {
      const op = tokens[i];
      if (op === '+' || op === '-') {
        const left = tokens[i - 1];
        const right = tokens[i + 1];

        const res = (op === '+') ? (left + right) : (left - right);
        tokens.splice(i - 1, 3, res);
        i = i - 1;
      } else {
        i++;
      }
    }

    if (tokens.length !== 1 || typeof tokens[0] !== 'number' || isNaN(tokens[0])) {
      throw new Error('Calculation failed');
    }

    return tokens[0];
  }

  function formatResult(num) {
    if (!isFinite(num)) {
      return 'Cannot divide by zero';
    }

    const rounded = Math.round((num + Number.EPSILON) * 1e10) / 1e10;
    const str = rounded.toString();

    if (Math.abs(rounded) < 1e12 && Math.abs(rounded) > 1e-6) {
      return str;
    }
    return String(parseFloat(rounded.toFixed(10)));
  }

  function calculateExpression(expr) {
    try {
      const tokens = tokenize(expr);
      validateTokens(tokens);
      const rawResult = evaluateTokens(tokens);
      const formatted = formatResult(rawResult);
      return { success: true, result: formatted };
    } catch (err) {
      return {
        success: false,
        error: (err.message === 'Cannot divide by zero') ? 'Cannot divide by zero' : 'Invalid expression'
      };
    }
  }

  function updateDisplay(value, isError = false) {
    display.value = value;
    currentExpression = value;
    if (isError) {
      display.classList.add('error-state');
      isErrorDisplayed = true;
    } else {
      display.classList.remove('error-state');
      isErrorDisplayed = false;
    }
  }

  function setPreviousDisplay(text) {
    previousDisplay.textContent = text;
  }

  function clearErrorIfNeeded() {
    if (isErrorDisplayed) {
      updateDisplay('');
      setPreviousDisplay('');
      isErrorDisplayed = false;
    }
  }

  // Calculator Actions
  function inputNumber(num) {
    clearErrorIfNeeded();

    if (isResultDisplayed) {
      updateDisplay(num);
      setPreviousDisplay('');
      isResultDisplayed = false;
      return;
    }

    
    updateDisplay(currentExpression + num);
  }

  
  function inputDecimal() {
    clearErrorIfNeeded();


    if (isResultDisplayed || currentExpression === '') {
      updateDisplay('0.');
      setPreviousDisplay('');
      isResultDisplayed = false;
      return;
    }

    
    const parts = currentExpression.split(/[\s+−×÷*/-]+/);
    const currentNumberPart = parts[parts.length - 1];

    if (currentNumberPart && currentNumberPart.includes('.')) {
      return;
    }

    const trimmed = currentExpression.trimEnd();
    if (trimmed.length === 0 || ['+', '−', '×', '÷', '-', '*', '/'].includes(trimmed.slice(-1))) {
      updateDisplay(currentExpression + '0.');
    } else {
      updateDisplay(currentExpression + '.');
    }
  }

  function inputOperator(op) {
    clearErrorIfNeeded();

    if (isResultDisplayed) {
      isResultDisplayed = false;
    }

    if (!currentExpression || currentExpression.trim() === '') {
      if (op === '−' || op === '-') {
        updateDisplay('−');
      }
      return;
    }

    const trimmed = currentExpression.trimEnd();

    const operatorPattern = /[\s]*([+−×÷*/-])[\s]*$/;
    if (operatorPattern.test(trimmed)) {

      const lastCharMatch = trimmed.match(/([+−×÷*/-])$/);
      const lastChar = lastCharMatch ? lastCharMatch[1] : '';

      if ((op === '−' || op === '-') && (lastChar === '×' || lastChar === '÷' || lastChar === '*' || lastChar === '/')) {
        updateDisplay(trimmed + ' −');
        return;
      }

      const updated = trimmed.replace(operatorPattern, ` ${op} `);
      updateDisplay(updated);
      return;
    }

    updateDisplay(`${trimmed} ${op} `);
  }

  function handleClear() {
    updateDisplay('');
    setPreviousDisplay('');
    isResultDisplayed = false;
    isErrorDisplayed = false;
  }

  function handleBackspace() {
    if (isErrorDisplayed) {
      handleClear();
      return;
    }

    if (isResultDisplayed) {
      handleClear();
      return;
    }

    if (!currentExpression || currentExpression.length === 0) {
      return;
    }


    let updated = currentExpression.trimEnd();
    updated = updated.slice(0, -1).trimEnd();

    updateDisplay(updated);
  }


  function handleEquals() {
    if (isErrorDisplayed) {
      return;
    }

    const expr = currentExpression.trim();
    if (!expr) {
      return;
    }

    const calc = calculateExpression(expr);

    if (calc.success) {
      setPreviousDisplay(`${expr} =`);
      updateDisplay(calc.result);
      isResultDisplayed = true;
      isErrorDisplayed = false;
    } else {
      updateDisplay(calc.error, true);
      isResultDisplayed = false;
      isErrorDisplayed = true;
    }
  }

  numberButtons.forEach(button => {
    button.addEventListener('click', () => {
      const num = button.getAttribute('data-number');
      if (num !== null) {
        inputNumber(num);
      }
    });
  });

  operatorButtons.forEach(button => {
    button.addEventListener('click', () => {
      const op = button.getAttribute('data-operator');
      if (op !== null) {
        inputOperator(op);
      }
    });
  });

  if (btnDecimal) {
    btnDecimal.addEventListener('click', inputDecimal);
  }

  if (btnClear) {
    btnClear.addEventListener('click', handleClear);
  }

  if (btnBackspace) {
    btnBackspace.addEventListener('click', handleBackspace);
  }

  if (btnEquals) {
    btnEquals.addEventListener('click', handleEquals);
  }

  display.addEventListener('keydown', (e) => {
    const key = e.key;

    if (key === 'Enter' || key === '=') {
      e.preventDefault();
      handleEquals();
      return;
    }

    if (key === 'Escape') {
      e.preventDefault();
      handleClear();
      return;
    }

    if (key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
      return;
    }

    if (key === '+') {
      e.preventDefault();
      inputOperator('+');
      return;
    }
    if (key === '-') {
      e.preventDefault();
      inputOperator('−');
      return;
    }
    if (key === '*' || key.toLowerCase() === 'x') {
      e.preventDefault();
      inputOperator('×');
      return;
    }
    if (key === '/') {
      e.preventDefault();
      inputOperator('÷');
      return;
    }
t
    if (key === '.') {
      e.preventDefault();
      inputDecimal();
      return;
    }

    if (key >= '0' && key <= '9') {
      e.preventDefault();
      inputNumber(key);
      return;
    }

    if (['ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(key)) {
      return;
    }
    e.preventDefault();
  });

  display.addEventListener('input', () => {
    let sanitized = display.value
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/-/g, '−')
      .replace(/[^0-9.+−×÷\s]/g, '');

    display.value = sanitized;
    currentExpression = sanitized;
  });

  window.addEventListener('keydown', (e) => {
    if (document.activeElement === display) {
      return;
    }

    const key = e.key;

    if (key >= '0' && key <= '9') {
      inputNumber(key);
    } else if (key === '.') {
      inputDecimal();
    } else if (key === '+') {
      inputOperator('+');
    } else if (key === '-') {
      inputOperator('−');
    } else if (key === '*' || key.toLowerCase() === 'x') {
      inputOperator('×');
    } else if (key === '/') {
      e.preventDefault(); 
      inputOperator('÷');
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      handleEquals();
    } else if (key === 'Backspace') {
      handleBackspace();
    } else if (key === 'Escape') {
      handleClear();
    }
  });
});
