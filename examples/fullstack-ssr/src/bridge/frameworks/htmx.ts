import htmx from 'htmx.org';

// Enforce strict Content Security Policy (CSP): disable runtime eval and new Function
htmx.config.allowEval = false;
htmx.config.selfRequestsOnly = true;

export default htmx;
export { htmx };

