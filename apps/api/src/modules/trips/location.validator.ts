import { body } from 'express-validator';

/**
 * POST /api/v1/trips/:tripId/location
 * Auth (BE-001) + assigned-driver check (BE-016) run before validation.
 * This chain covers shape only; business rules live in location.service.
 */
export function tripLocationValidators() {
  return [
    body('lat')
      .exists()
      .withMessage('Latitude is required')
      .bail()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('lng')
      .exists()
      .withMessage('Longitude is required')
      .bail()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('accuracyM')
      .exists()
      .withMessage('Accuracy is required')
      .bail()
      .isFloat({ min: 0, max: 1000 })
      .withMessage('Accuracy must be between 0 and 1000m'),
    body('timestamp')
      .exists()
      .withMessage('Timestamp is required')
      .bail()
      .isISO8601()
      .withMessage('Timestamp must be ISO-8601'),
  ];
}
