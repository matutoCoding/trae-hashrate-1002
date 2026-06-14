import type { WeaveCell, WeaveParams, DensityResult, MaterialsResult, MaterialItem } from '@/types';

const LIGHT_TRANSMISSION_COEFFICIENT = 0.85;
const MM_PER_10CM = 100;

export function calcDensity(bambooWidth: number, gap: number): number {
  if (bambooWidth <= 0) return 0;
  const totalSpacing = bambooWidth + gap;
  if (totalSpacing <= 0) return 0;
  return MM_PER_10CM / totalSpacing;
}

export function calcPorosity(bambooWidth: number, gap: number): number {
  if (bambooWidth <= 0 && gap <= 0) return 0;
  const totalSpacing = bambooWidth + gap;
  if (totalSpacing <= 0) return 0;
  return (gap * gap) / (totalSpacing * totalSpacing);
}

export function calcLightTransmission(bambooWidth: number, gap: number): number {
  const porosity = calcPorosity(bambooWidth, gap);
  return porosity * LIGHT_TRANSMISSION_COEFFICIENT;
}

export function calcAllDensity(bambooWidth: number, gap: number): DensityResult {
  const densityWarp = calcDensity(bambooWidth, gap);
  const densityWeft = calcDensity(bambooWidth, gap);
  const porosity = calcPorosity(bambooWidth, gap);
  const lightTransmission = calcLightTransmission(bambooWidth, gap);

  return {
    densityWarp,
    densityWeft,
    porosity,
    lightTransmission,
  };
}

export function calcMaterials(
  matrix: WeaveCell[][],
  params: WeaveParams
): MaterialsResult {
  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0].length : 0;

  const { bambooWidth, bambooGap, finishedWidth, finishedHeight, lossRate } = params;

  const safeLossRate = Math.max(0, Math.min(1, lossRate));
  const safeBambooWidth = Math.max(0.1, bambooWidth);
  const safeBambooGap = Math.max(0, bambooGap);

  const warpCount = cols;
  const weftCount = rows;

  const totalUnitWidth = safeBambooWidth + safeBambooGap;
  const finishedWidthMm = finishedWidth * 10;
  const finishedHeightMm = finishedHeight * 10;

  const warpLengthPerBamboo = calcBambooLength(finishedHeightMm, safeLossRate);
  const weftLengthPerBamboo = calcBambooLength(finishedWidthMm, safeLossRate);

  const warpBamboos: MaterialItem[] = buildMaterialItems(
    warpCount,
    warpLengthPerBamboo,
    safeBambooWidth,
    '经篾',
    '#8B4513'
  );

  const weftBamboos: MaterialItem[] = buildMaterialItems(
    weftCount,
    weftLengthPerBamboo,
    safeBambooWidth,
    '纬篾',
    '#A0522D'
  );

  const totalLength =
    warpBamboos.reduce((sum, item) => sum + item.lengthMm * item.count, 0) +
    weftBamboos.reduce((sum, item) => sum + item.lengthMm * item.count, 0);

  return {
    warpBamboos,
    weftBamboos,
    totalLength,
  };
}

function calcBambooLength(finishedLengthMm: number, lossRate: number): number {
  const extraMarginMm = 50;
  const baseLength = finishedLengthMm + extraMarginMm * 2;
  return Math.ceil(baseLength * (1 + lossRate));
}

function buildMaterialItems(
  count: number,
  lengthMm: number,
  widthMm: number,
  spec: string,
  color: string
): MaterialItem[] {
  if (count <= 0) return [];

  const items: MaterialItem[] = [];
  const bundleSize = 10;
  const fullBundles = Math.floor(count / bundleSize);
  const remaining = count % bundleSize;

  let processIndex = 0;

  for (let i = 0; i < fullBundles; i++) {
    items.push({
      id: generateId(),
      spec,
      color,
      widthMm,
      lengthMm,
      count: bundleSize,
      processIndex,
    });
    processIndex++;
  }

  if (remaining > 0) {
    items.push({
      id: generateId(),
      spec,
      color,
      widthMm,
      lengthMm,
      count: remaining,
      processIndex,
    });
  }

  return items;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
