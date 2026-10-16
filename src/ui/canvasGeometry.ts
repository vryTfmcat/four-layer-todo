export const CANVAS_CARD_WIDTH = 250;
export const CANVAS_CARD_HEIGHT = 280;
export type CardBounds = { x: number; y: number; width: number; height: number };

/** Intersect the center-to-center ray with each card's own border. */
export function getConnectionCoordinates(from: CardBounds, to: CardBounds) {
  if (from.width <= 0 || from.height <= 0 || to.width <= 0 || to.height <= 0) return null;
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (!dx && !dy) return null;
  const fromFactor = 1 / Math.max(Math.abs(dx) / (from.width / 2), Math.abs(dy) / (from.height / 2));
  const toFactor = 1 / Math.max(Math.abs(dx) / (to.width / 2), Math.abs(dy) / (to.height / 2));
  return { x1: fromX + dx * fromFactor, y1: fromY + dy * fromFactor,
    x2: toX - dx * toFactor, y2: toY - dy * toFactor };
}
