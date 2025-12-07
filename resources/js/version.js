// VERSION CONTROL - Single source of truth
// Update this ONE line to deploy a new version
const VERSION = '0.3.2';

// Export for ES6 modules (main app)
export { VERSION };

// Expose for service worker (non-module context)
if (typeof self !== 'undefined' && !self.document) {
  self.VERSION = VERSION;
}
