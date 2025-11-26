export function clamp(value, min, max) {
  if (min > max) {
    [min, max] = [max, min];
  }
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function randomRange(min, max) {
  if (min === max) return min;
  if (min > max) {
    [min, max] = [max, min];
  }
  return Math.random() * (max - min) + min;
}

export function overlap(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

export function snapshot(source, keys = []) {
  const out = {};
  keys.forEach((key) => {
    out[key] = source[key];
  });
  return out;
}
