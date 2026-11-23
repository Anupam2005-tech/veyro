import { Router } from 'express';
import { body } from 'express-validator';
import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_CATEGORIES } from '../../config/policy.js';
import { authenticate, currentUser, requireRole } from '../../middleware/authenticate.js';
import { db, mutate, newId, nowIso } from '../../store/db.js';
import { checkValidation, handle, param, str } from '../../shared/http/handler.js';
import { sendSuccess } from '../../shared/http/response.js';
import { NotFoundError } from '../../shared/errors/errors.js';
import { createVehicle } from '../vehicles/vehicle.service.js';

const vehicleRules = (optional: boolean) => {
  const f = (name: string) => (optional ? body(name).optional() : body(name));
  return [
    f('make').isString().trim().isLength({ min: 1, max: 40 }).withMessage('Make is required.'),
    f('model').isString().trim().isLength({ min: 1, max: 40 }).withMessage('Model is required.'),
    f('plate').optional().isString().trim().isLength({ max: 20 }),
    f('category').isIn([...VEHICLE_CATEGORIES]).withMessage('Choose a vehicle category.'),
    f('transmission').isIn([...TRANSMISSIONS]).withMessage('Choose a transmission.'),
    f('fuelType').isIn([...FUEL_TYPES]).withMessage('Choose a fuel type.'),
    body('isDefault').optional().isBoolean(),
  ];
};

export function vehicleRouter(): Router {
  const router = Router();
  router.use(authenticate, requireRole('CUSTOMER'));

  router.get('/', handle((_req, res) => {
    const me = currentUser(res);
    return sendSuccess(res, db().vehicles.filter((v) => v.customerId === me.id), 'Vehicles loaded.');
  }));

  router.post('/', ...vehicleRules(false), checkValidation, handle((req, res) => {
    const me = currentUser(res);
    const id = newId('veh');
    const checked = createVehicle({ id, ownerUid: me.id, category: req.body.category, transmission: req.body.transmission, fuelType: req.body.fuelType });
    const vehicle = mutate((data) => {
      const mine = data.vehicles.filter((v) => v.customerId === me.id);
      const makeDefault = req.body.isDefault === true || mine.length === 0;
      if (makeDefault) mine.forEach((v) => (v.isDefault = false));
      const v = {
        id,
        customerId: me.id,
        make: str(req.body.make, 40),
        model: str(req.body.model, 40),
        plate: str(req.body.plate, 20).toUpperCase(),
        category: checked.category,
        transmission: checked.transmission,
        fuelType: checked.fuelType,
        isDefault: makeDefault,
        createdAt: nowIso(),
      };
      data.vehicles.push(v);
      return v;
    });
    return sendSuccess(res, vehicle, 'Vehicle added.', 201);
  }));

  router.patch('/:id', ...vehicleRules(true), checkValidation, handle((req, res) => {
    const me = currentUser(res);
    const vehicle = mutate((data) => {
      const v = data.vehicles.find((x) => x.id === param(req, 'id') && x.customerId === me.id);
      if (!v) throw new NotFoundError('Vehicle not found.');
      for (const key of ['make', 'model', 'category', 'transmission', 'fuelType'] as const) {
        if (typeof req.body[key] === 'string') v[key] = str(req.body[key], 40);
      }
      if (typeof req.body.plate === 'string') v.plate = str(req.body.plate, 20).toUpperCase();
      if (req.body.isDefault === true) {
        data.vehicles.filter((x) => x.customerId === me.id).forEach((x) => (x.isDefault = false));
        v.isDefault = true;
      }
      return v;
    });
    return sendSuccess(res, vehicle, 'Vehicle updated.');
  }));

  router.delete('/:id', handle((req, res) => {
    const me = currentUser(res);
    mutate((data) => {
      const idx = data.vehicles.findIndex((x) => x.id === param(req, 'id') && x.customerId === me.id);
      if (idx < 0) throw new NotFoundError('Vehicle not found.');
      const [removed] = data.vehicles.splice(idx, 1);
      if (removed?.isDefault) {
        const next = data.vehicles.find((x) => x.customerId === me.id);
        if (next) next.isDefault = true;
      }
    });
    return sendSuccess(res, { id: param(req, 'id') }, 'Vehicle removed.');
  }));

  return router;
}
