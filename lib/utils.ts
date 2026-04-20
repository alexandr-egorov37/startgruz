export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export function formatPrice(price: string | number) {
  const p = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(p)) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'decimal' }).format(p) + ' ₽';
}
