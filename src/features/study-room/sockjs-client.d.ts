declare module "sockjs-client" {
  import type { IStompSocket } from "@stomp/stompjs";

  export default class SockJS implements IStompSocket {
    constructor(
      url: string,
      protocols?: string | string[],
      options?: Record<string, unknown>,
    );

    readonly readyState: number;
    url: string;
    binaryType?: string;
    onclose: ((event?: unknown) => unknown) | null;
    onerror: ((event: unknown) => unknown) | null;
    onmessage: ((event: unknown) => unknown) | null;
    onopen: ((event?: unknown) => unknown) | null;

    close(): void;
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  }
}
