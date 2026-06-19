/* ── State ── */
  let currentInput    = '0';
  let prevInput       = null;
  let operator        = null;
  let waitingForNext  = false;
  let justEvaluated   = false;
  let expression      = '';

  const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  /* ── DOM refs ── */
  const displayEl = document.getElementById('display');
  const exprEl    = document.getElementById('expr');

  /* ── Display helpers ── */
  function updateDisplay(val, isError = false) {
    displayEl.textContent = val;
    displayEl.className   = 'display-val' + (isError ? ' error' : '');
  }

  /**
   * formatNumber — converts a float to a clean string.
   * Uses toPrecision(12) to kill floating-point noise,
   * then strips trailing zeros after the decimal point.
   */
  function formatNumber(n) {
    if (!isFinite(n) || isNaN(n)) return null;
    const s = parseFloat(n.toPrecision(12)).toString();
    return s;
  }

  /* ── Input parsing ── */
  function parseCurrentInput() {
    const n = parseFloat(currentInput);
    if (isNaN(n)) throw new Error('Invalid number');
    return n;
  }

  /* ── Arithmetic ── */
  function calculate(a, op, b) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/':
        if (b === 0) throw new Error('Cannot divide by zero');
        return a / b;
      default:
        throw new Error('Unknown operator: ' + op);
    }
  }

  /* ── Error display ── */
  function showError(msg) {
    updateDisplay(msg, true);
    /* reset state so the calculator is always recoverable */
    currentInput   = '0';
    prevInput      = null;
    operator       = null;
    waitingForNext = false;
    justEvaluated  = false;
    expression     = '';
    exprEl.textContent = '';
    setTimeout(() => updateDisplay('0'), 1800);
  }

  /* ── Button handlers ── */

  function handleDigit(d) {
    if (waitingForNext || justEvaluated) {
      currentInput   = d;
      waitingForNext = false;
      if (justEvaluated) { expression = ''; justEvaluated = false; }
    } else {
      if (currentInput === '0' && d !== '.') {
        currentInput = d;               /* replace leading zero */
      } else if (currentInput.length < 12) {
        currentInput += d;
      }
    }
    updateDisplay(currentInput);
  }

  function handleDecimal() {
    if (waitingForNext || justEvaluated) {
      currentInput   = '0.';
      waitingForNext = false;
      if (justEvaluated) { expression = ''; justEvaluated = false; }
    } else if (!currentInput.includes('.')) {
      currentInput += '.';
    }
    updateDisplay(currentInput);
  }

  function handleOp(op) {
    try {
      /* chain operations: evaluate pending op before storing new one */
      if (operator && !waitingForNext && !justEvaluated) {
        const a      = parseFloat(prevInput);
        const b      = parseCurrentInput();
        const result = calculate(a, operator, b);
        const fmt    = formatNumber(result);
        if (!fmt) throw new Error('Result out of range');
        currentInput = fmt;
        expression   = fmt + ' ' + opSymbols[op];
        updateDisplay(currentInput);
      } else {
        expression = currentInput + ' ' + opSymbols[op];
      }
      prevInput      = currentInput;
      operator       = op;
      waitingForNext = true;
      justEvaluated  = false;
      exprEl.textContent = expression;
    } catch (e) {
      showError(e.message);
    }
  }

  /* Event listener on equals button (also called by keyboard Enter) */
  function handleEquals() {
    if (!operator || prevInput === null) return;
    try {
      const a      = parseFloat(prevInput);
      const b      = parseCurrentInput();
      const exBase = (expression.replace(/[+−×÷]\s*$/, '').trim() || prevInput);
      expression   = exBase + ' ' + opSymbols[operator] + ' ' + currentInput + ' =';
      const result = calculate(a, operator, b);
      const fmt    = formatNumber(result);
      if (!fmt) throw new Error('Result out of range');
      currentInput   = fmt;
      operator       = null;
      prevInput      = null;
      waitingForNext = false;
      justEvaluated  = true;
      updateDisplay(currentInput);
      exprEl.textContent = expression;
    } catch (e) {
      showError(e.message);
    }
  }

  function handleClear() {
    currentInput   = '0';
    prevInput      = null;
    operator       = null;
    waitingForNext = false;
    justEvaluated  = false;
    expression     = '';
    updateDisplay('0');
    exprEl.textContent = '';
  }

  function handleSign() {
    if (currentInput === '0') return;
    currentInput = currentInput.startsWith('-')
      ? currentInput.slice(1)
      : '-' + currentInput;
    updateDisplay(currentInput);
  }

  function handlePercent() {
    try {
      const n   = parseCurrentInput() / 100;
      const fmt = formatNumber(n);
      if (!fmt) throw new Error('Result out of range');
      currentInput = fmt;
      updateDisplay(currentInput);
    } catch (e) {
      showError(e.message);
    }
  }

  function handleBackspace() {
    if (waitingForNext || justEvaluated) return;
    const isNegSingle = currentInput.startsWith('-') && currentInput.length === 2;
    if (currentInput.length <= 1 || isNegSingle) {
      currentInput = '0';
    } else {
      currentInput = currentInput.slice(0, -1);
    }
    updateDisplay(currentInput);
  }

  /* ── Event listeners ── */

  /* Delegated click listener — one handler for all buttons */
  document.querySelector('.btn-grid').addEventListener('click', function (e) {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const action = btn.dataset.action;
    const val    = btn.dataset.val;

    switch (action) {
      case 'digit':   handleDigit(val);   break;
      case 'decimal': handleDecimal();    break;
      case 'op':      handleOp(val);      break;
      case 'equals':  handleEquals();     break;  /* ← equals button listener */
      case 'clear':   handleClear();      break;
      case 'sign':    handleSign();       break;
      case 'percent': handlePercent();    break;
    }
  });

  /* Keyboard input handler */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;  /* ignore shortcuts */
    const k = e.key;

    if (k >= '0' && k <= '9')                  { e.preventDefault(); handleDigit(k);    }
    else if (k === '.')                          { e.preventDefault(); handleDecimal();   }
    else if (k === '+')                          { e.preventDefault(); handleOp('+');     }
    else if (k === '-')                          { e.preventDefault(); handleOp('-');     }
    else if (k === '*')                          { e.preventDefault(); handleOp('*');     }
    else if (k === '/')                          { e.preventDefault(); handleOp('/');     }
    else if (k === 'Enter' || k === '=')         { e.preventDefault(); handleEquals();   }
    else if (k === 'Escape')                     { e.preventDefault(); handleClear();    }
    else if (k === 'Backspace')                  { e.preventDefault(); handleBackspace();}
    else if (k === '%')                          { e.preventDefault(); handlePercent();  }
  });