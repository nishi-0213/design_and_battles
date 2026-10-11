import { sensorParts } from './SensorParts.js';
import { missileParts } from './MissileParts.js';
import { planeParts } from './PlaneParts.js';
import { cabinParts } from './CabinParts.js';
import { generatorParts } from './GeneratorParts.js';
import { ammoParts } from './AmmoParts.js';
import { gunParts } from './GunParts.js';
import { fuelParts } from './FuelParts.js';
import { engineParts } from './EngineParts.js';
import { bridgePart } from './BridgePart.js';
import { hullParts } from './HullParts.js';
const asset = (name) => `${import.meta.env.BASE_URL}assets/armor/${name}.png`;
export const armorParts = [
  { id: 'armor-1x1', label: '1x1', width: 1, height: 1, category: 'ARMOR', mass: 1, rotationStep: 90, url: asset('1x1') },
  { id: 'armor-1x2', label: '1x2', width: 1, height: 2, category: 'ARMOR', mass: 2, rotationStep: 90, url: asset('1x2') },
  { id: 'armor-1x1half', label: '1x1half', width: 1, height: 1, category: 'ARMOR', mass: 0.5, rotationStep: 90, url: asset('1x1half') },
];
export const allParts = [...hullParts, ...armorParts, ...engineParts, ...fuelParts, ...gunParts, ...ammoParts, ...generatorParts, ...cabinParts, ...planeParts, ...missileParts, ...sensorParts, bridgePart];
export const findPart = (id) => allParts.find(part => part.id === id);
