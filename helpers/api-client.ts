import type { APIRequestContext, APIResponse } from '@playwright/test';

const DEFAULT_API_TIMEOUT_MS = 90_000;

type GetOptions = NonNullable<Parameters<APIRequestContext['get']>[1]>;
type PostOptions = NonNullable<Parameters<APIRequestContext['post']>[1]>;

export class ApiClient {
  public constructor(private readonly request: APIRequestContext) {}

  public get(path: string, options: GetOptions = {}): Promise<APIResponse> {
    return this.request.get(path, {
      timeout: DEFAULT_API_TIMEOUT_MS,
      ...options,
    });
  }

  public postJson(
    path: string,
    data: unknown,
    options: PostOptions = {},
  ): Promise<APIResponse> {
    return this.request.post(path, {
      data,
      timeout: DEFAULT_API_TIMEOUT_MS,
      ...options,
    });
  }

  public contentType(response: APIResponse): string {
    return response.headers()['content-type'] ?? '';
  }

  public correlationId(response: APIResponse): string | undefined {
    return response.headers()['x-correlation-id'];
  }

  public async json<T>(response: APIResponse): Promise<T> {
    return (await response.json()) as T;
  }

  public async bodyText(response: APIResponse): Promise<string> {
    return response.text();
  }
}
