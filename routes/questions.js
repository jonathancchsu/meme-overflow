const express = require('express');
const { check } = require("express-validator");
const { asyncHandler, csrfProtection, handleValidationErrors } = require('./utils');
const { requireAuth } = require("../auth");
const router = express.Router();
const db = require('../db/models');

const { Question, User } = db;

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const questions = await Question.findAll({
      include: [{ model: User, as: "user", attributes: ["username"]}],
      order: [["createdAt", "DESC"]],
      attributes: ["title", "body"]
    })
    res.json({ questions });
  })
)

const questionNotFoundError = (id) => {
  const err = Error("Question not found");
  err.errors = [`Question with id of ${id} could not be found.`];
  err.title = "Question not found";
  err.status = 404;
  return err;
};

const validateQuestion = [
  check("body")
    .exists({ checkFalsy: true })
    .withMessage("Question cannot be empty"),
  check("title")
    .exists({ checkFalsy: true })
    .withMessage("Title cannot be empty"),
  check("title")
    .isLength({ max: 300 })
    .withMessage("Question title cannot be over 300 characters"),
  // handleValidationErrors,
];

router.get(
  '/:id',
  asyncHandler(async (req, res, next) => {
    const question = await Question.findOne({
      where: {
        id: req.params.id,
      },
    })
    if (question) {
      res.json({ question });
    } else {
      next(questionNotFoundError(req.params.id));
    }
  })
);

router.post(
  "/",
  csrfProtection,
  validateQuestion,
  asyncHandler(async (req, res) => {
    const { title, body } = req.body;
    const question = await Question.create({ title, body, userId: req.user.id });
    res.json({ question });
  })
);

router.put(
  "/:id",
  csrfProtection,
  validateQuestion,
  asyncHandler(async (req, res, next) => {
    const question = await Question.findOne({
      where: {
        id: req.params.id,
      },
    });
    if (req.user.id !== question.userId) {
      const err = new Error("Unauthorized");
      err.status = 401;
      err.message = "You do not have the right to edit this question.";
      err.title = "Unauthorized";
      throw err;
    }
    if (question) {
      await question.update({ body: req.body.body });
      res.json({ question });
    } else {
      next(questionNotFoundError(req.params.id));
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res, next) => {
    const question = await Question.findOne({
      where: {
        id: req.params.id,
      },
    });
    if (req.user.id !== question.userId) {
      const err = new Error("Unauthorized");
      err.status = 401;
      err.message = "You do not have the right to edit this question.";
      err.title = "Unauthorized";
      throw err;
    }
    if (question) {
      await question.destroy();
      res.json({ message: `Deleted question with id of ${req.params.id}.` });
    } else {
      next(questionNotFoundError(req.params.id));
    }
  })
);

module.exports = router;
