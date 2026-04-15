import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validationResult } from 'express-validator';

const validate: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() });
    return;
  }
  next();
};

export = validate;
