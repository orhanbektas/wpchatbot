function randomDelay(minMs, maxMs) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function typingDelay(text) {
  // ~50ms per char, capped between 1s and 5s
  const ms = Math.min(Math.max(text.length * 50, 1000), 5000);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { randomDelay, typingDelay, sleep };
