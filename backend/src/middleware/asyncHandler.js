// Express 4 doesn't catch rejected promises from async route handlers —
// an unhandled rejection there crashes the whole Node process, taking
// every user down with it, not just the request that errored. Wrapping
// each handler routes the rejection to Express's error middleware instead.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
