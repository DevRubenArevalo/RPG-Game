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

/**
 * Detects collision between a circle and a rectangle.
 * Used for boss morphing collision detection.
 * @param {number} circleX - Center X of circle
 * @param {number} circleY - Center Y of circle
 * @param {number} radius - Radius of circle
 * @param {object} rect - Rectangle with x, y, w, h properties
 * @returns {boolean} True if collision detected
 */
export function circleRectCollision(circleX, circleY, radius, rect) {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(rect.x, Math.min(circleX, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circleY, rect.y + rect.h));
  
  // Calculate distance between circle center and closest point
  const dx = circleX - closestX;
  const dy = circleY - closestY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance < radius;
}

/**
 * Detects collision with boss considering current morph state.
 * Uses circle collision when in circle mode, rectangle collision when in square mode.
 * @param {object} boss - Boss entity with x, y, w, h, morphMode properties
 * @param {object} rect - Rectangle entity to test against
 * @returns {boolean} True if collision detected
 */
export function checkBossCollision(boss, rect) {
  // Use hard switch based on morphMode, not blended transition
  if (boss.morphMode === 'square') {
    // Square mode - use full rectangle collision (no inset)
    return overlap(boss, rect);
  } else {
    // Circle mode - use blended circle collision based on morphBlend
    const blend = Math.max(0, Math.min(1, boss.morphBlend ?? (boss.morphMode === 'square' ? 1 : 0)));
    const radius = (boss.w / 2) * (1 - blend);
    const centerX = boss.x + boss.w / 2;
    const centerY = boss.y + boss.h / 2;
    return circleRectCollision(centerX, centerY, radius, rect);
  }
}
