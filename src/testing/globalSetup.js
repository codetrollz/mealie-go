// Run every test in one fixed timezone so date logic is deterministic on any
// machine. New York is behind UTC, which is where local date != UTC date in the
// evening (the case that used to shift meal plan days).
module.exports = async () => {
  process.env.TZ = 'America/New_York';
};
