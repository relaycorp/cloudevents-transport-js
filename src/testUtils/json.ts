export function jsonSerialise(obj: any): Buffer {
  return Buffer.from(JSON.stringify(obj));
}
