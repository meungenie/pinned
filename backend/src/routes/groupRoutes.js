const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const groupController = require("../controllers/groupController");

router.post("/", protect, groupController.createGroup);
router.get("/me", protect, groupController.getMyGroups);
router.get("/invite/:code", groupController.getGroupByInviteCode);
router.post("/invite/:code/join", protect, groupController.joinGroup);
router.get("/:groupId", protect, groupController.getGroup);
router.get("/:groupId/pins", protect, groupController.getGroupPins);
router.post("/:groupId/pins", protect, groupController.createGroupPin);

module.exports = router;
