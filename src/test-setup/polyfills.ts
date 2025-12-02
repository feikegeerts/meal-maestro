import {
  ReadableStream as NodeReadableStream,
  TransformStream as NodeTransformStream,
  WritableStream as NodeWritableStream,
} from "node:stream/web";

// Align Node's stream/web implementations with the globals expected by jsdom.
if (!globalThis.ReadableStream) {
  globalThis.ReadableStream = NodeReadableStream as unknown as typeof globalThis.ReadableStream;
}

if (!globalThis.WritableStream) {
  globalThis.WritableStream = NodeWritableStream as unknown as typeof globalThis.WritableStream;
}

if (!globalThis.TransformStream) {
  globalThis.TransformStream = NodeTransformStream as unknown as typeof globalThis.TransformStream;
}
