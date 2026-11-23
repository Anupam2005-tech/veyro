import { body } from 'express-validator';

/**
 * PATCH /api/v1/drivers/availability
 * Body: { status: 'ONLINE' | 'OFFLINE' }
 * Auth (BE-001) + role/account checks run before validation for protected routes;
 * this chain covers shape only. Business rules live in availability.service.
 */
export function availabilityStatusValidators() {
  return [
    body('status')
      .exists({ values: 'undefined' })
      .withMessage('Availability status is required')
      .bail()
      .isString()
      .withMessage('Availability status must be a string')
      .bail()
      .isIn(['ONLINE', 'OFFLINE'])
      .withMessage('Availability status must be ONLINE or OFFLINE'),
  ];
}
