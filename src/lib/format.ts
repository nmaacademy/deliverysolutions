export const formatTime = (date: Date) =>
  date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

export const minutesSince = (date: Date) => Math.floor((Date.now() - date.getTime()) / 60000);

/** Orders are shown as "#123" everywhere, while the stored id stays "ORD-123". */
export const shortOrderId = (id: string) => id.replace('ORD-', '');
