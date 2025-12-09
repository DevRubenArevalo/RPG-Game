# Event System Documentation

## Available Events

### Combat Events

#### `enemy:killed`
Fired when an enemy is defeated
```javascript
eventBus.emit('enemy:killed', { 
  enemy,              // Enemy object that was killed
  position,           // {x, y} position where enemy died
  enemyProjectiles    // Reference to projectile array (for cleanup)
});
```

**Current Listeners:**
- Plays enemy death sound
- Spawns slime chunks at enemy position
- Spawns coins at enemy position

---

#### `player:damaged`
Fired when player takes damage
```javascript
eventBus.emit('player:damaged', { 
  amount,    // Damage amount
  source,    // Source object (enemy, projectile, etc.)
  sourceX    // X position of damage source (for knockback direction)
});
```

**Current Listeners:**
- Reduces player health
- Spawns damage number
- Plays hit sound
- Applies invulnerability timer
- Applies knockback effect
- Triggers game over if health <= 0

---

### Collection Events

#### `player:collected:chunk`
Fired when player collects a slime chunk
```javascript
eventBus.emit('player:collected:chunk', { 
  chunk  // Chunk object collected
});
```

**Current Listeners:**
- Heals player for 1 HP (or 10 HP + 10 max HP during boss rain)
- Plays chunk collection sound

---

#### `player:collected:coin`
Fired when player collects a coin
```javascript
eventBus.emit('player:collected:coin', { 
  coin,     // Coin object collected
  amount    // Coin value (after multiplier)
});
```

**Current Listeners:**
- Adds coins to player inventory
- Plays coin collection sound

---

### Shop Events

#### `shop:reached`
Fired when player reaches shop distance
```javascript
eventBus.emit('shop:reached');
```

**Current Listeners:**
- Opens shop UI
- Pauses game
- Displays shop options

---

### Boss Events

#### `boss:defeated`
Fired when boss health reaches 0
```javascript
eventBus.emit('boss:defeated', { 
  boss  // Boss enemy object
});
```

**Current Listeners:**
- Stops boss music
- Pauses game
- Clears player inputs
- Initiates defeat cinematic sequence

---

#### `boss:shield:activated`
Fired when boss activates shield (health bar depleted)
```javascript
eventBus.emit('boss:shield:activated', { 
  boss  // Boss enemy object
});
```

**Current Listeners:**
- Spawns 10 health chunks
- Logs shield activation

---

## Adding New Events

### 1. Define the event name
Use kebab-case with namespace prefix:
```javascript
'entity:action:detail'
// Examples:
'player:level:up'
'enemy:spawned'
'ability:activated'
```

### 2. Emit the event
```javascript
eventBus.emit('event:name', { 
  // Include relevant data
  entity,
  amount,
  position
});
```

### 3. Add listeners
```javascript
// In main.js EVENT LISTENERS section
eventBus.on('event:name', ({ entity, amount }) => {
  // Handle the event
});
```

### 4. Document it
Add to this file with:
- Event name
- When it fires
- Data payload structure
- Current listeners

---

## Event System Benefits

### ✅ Decoupling
Systems don't need to know about each other. `enemy.js` doesn't need to know about audio, coins, or chunks.

### ✅ Flexibility
Easy to add new behaviors without modifying existing code. Want to add screen shake on damage? Just add a listener.

### ✅ Testing
Can test systems in isolation by mocking events.

### ✅ Debugging
Enable debug mode to see all events:
```javascript
eventBus.setDebug(true);
```

### ✅ Maintainability
Clear separation of concerns. Each system handles its own responsibility.

---

## Future Event Candidates

### Abilities
```javascript
'ability:unlocked'  // When player gets new ability
'ability:used'      // When ability is activated
'mutation:complete' // When player mutation finishes
```

### World
```javascript
'platform:corroded' // When acid melts platform
'room:entered'      // When player enters new area
'checkpoint:reached' // Distance milestones
```

### UI
```javascript
'pause:toggled'     // Game pause state changed
'menu:opened'       // Menu system activated
'settings:changed'  // Game settings updated
```

### Save/Load
```javascript
'game:saved'        // Save file created
'game:loaded'       // Save file loaded
'highscore:new'     // New high score achieved
```

---

## Best Practices

1. **Always include relevant context** - Pass objects, not just IDs
2. **Use past tense for completed actions** - `enemy:killed` not `enemy:kill`
3. **Namespace your events** - Use prefixes to group related events
4. **Document payload structure** - Clear contracts between emitter and listeners
5. **Handle errors gracefully** - Event system catches listener errors automatically
6. **Don't overuse** - Not everything needs to be an event. Direct calls are fine for tightly coupled systems.

---

## Debugging

### Enable event logging
```javascript
eventBus.setDebug(true);
```

### Check active listeners
```javascript
console.log(eventBus.getEventNames());
console.log(eventBus.listenerCount('enemy:killed'));
```

### Remove all listeners (for testing)
```javascript
eventBus.clear(); // Clear all
eventBus.clear('enemy:killed'); // Clear specific event
```
