// Color palette for distinguishing production orders
export const ORDER_COLOR_PALETTE = [
  '#0A84FF', // azul iOS
  '#FF9F0A', // naranja
  '#30D158', // verde
  '#BF5AF2', // púrpura
  '#FF375F', // rosa
  '#64D2FF', // cyan
  '#FFD60A', // amarillo
  '#AC8E68', // marrón
  '#FF6482', // salmón
  '#5E5CE6', // índigo
]

export function getOrderColor(orderNumber: number | undefined): string | undefined {
  if (orderNumber == null) return undefined
  return ORDER_COLOR_PALETTE[orderNumber % ORDER_COLOR_PALETTE.length]
}
