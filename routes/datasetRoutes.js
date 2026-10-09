const router = require("express").Router();
const { asyncHandler, validateId } = require("../middlewares/error");
const c = require("../controllers/datasetController");
// auth + the large JSON parser are mounted in app.js, so unauthenticated callers can't push big bodies.
router.post("/", asyncHandler(c.create));
router.get("/", asyncHandler(c.list));
router.get("/stats", asyncHandler(c.stats));
router.get("/:id", validateId(), asyncHandler(c.get));
router.get("/:id/sheets/:index", validateId(), asyncHandler(c.getSheet));
router.get("/:id/download", validateId(), asyncHandler(c.download));
router.patch("/:id", validateId(), asyncHandler(c.update));
router.put("/:id/insights", validateId(), asyncHandler(c.saveInsights));
router.delete("/:id", validateId(), asyncHandler(c.remove));
module.exports = router;
