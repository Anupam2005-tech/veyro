export type VehicleCategory = 'HATCHBACK' | 'SEDAN' | 'SUV' | 'MUV';
export type Transmission = 'MANUAL' | 'AUTOMATIC';

export interface Vehicle {
  readonly id: string;
  readonly ownerUid: string;
  readonly category: VehicleCategory;
  readonly transmission: Transmission;
  readonly fuelType: string;
}

const CATEGORIES: readonly VehicleCategory[] = ['HATCHBACK', 'SEDAN', 'SUV', 'MUV'];

export function createVehicle(input: {
  id: string;
  ownerUid: string;
  category: string;
  transmission: string;
  fuelType: string;
}): Vehicle {
  if (!input.id.trim() || !input.ownerUid.trim()) throw new RangeError('Vehicle id and owner are required');
  if (!CATEGORIES.includes(input.category as VehicleCategory)) throw new RangeError('Unsupported vehicle category');
  if (input.transmission !== 'MANUAL' && input.transmission !== 'AUTOMATIC') {
    throw new RangeError('Transmission must be MANUAL or AUTOMATIC');
  }
  return {
    id: input.id.trim(),
    ownerUid: input.ownerUid.trim(),
    category: input.category as VehicleCategory,
    transmission: input.transmission,
    fuelType: input.fuelType.trim() || 'PETROL',
  };
}

export function vehicleCompatible(
  vehicle: Pick<Vehicle, 'category' | 'transmission'>,
  supportedCategories: readonly string[],
  supportedTransmissions: readonly string[],
): boolean {
  return (
    supportedCategories.includes(vehicle.category) &&
    supportedTransmissions.includes(vehicle.transmission)
  );
}
