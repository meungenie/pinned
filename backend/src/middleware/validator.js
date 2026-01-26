const { body, validationResult } = require("express-validator");

exports.validateSignup = [
  body("handle")
    .isAlphanumeric()
    .withMessage("영문과 숫자만 가능합니다.")
    .isLength({ min: 3 })
    .withMessage("핸들은 최소 3자 이상이어야 합니다."),
  body("email").isEmail().withMessage("유효한 이메일 형식이 아닙니다."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("비밀번호는 최소 8자 이상이어야 합니다."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    next();
  },
];
