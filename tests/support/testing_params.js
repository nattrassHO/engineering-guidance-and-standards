export const testing_params = {
  TEST_URL: process.env.TEST_URL ?? 'http://127.0.0.1',
  TEST_PORT: process.env.TEST_PORT ?? '8080',
  TEST_PATH: process.env.TEST_PATH ?? '',
  
  get TEST_ROOT_URL() {
    let normalizedUrl = this.TEST_URL.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `http://${normalizedUrl}`;
    }

    const parsedUrl = new URL(normalizedUrl);
    if (!parsedUrl.port && this.TEST_PORT) {
      parsedUrl.port = this.TEST_PORT;
    }

    const basePath = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '');
    const extraPath = this.TEST_PATH
      ? `/${this.TEST_PATH.replace(/^\/+|\/+$/g, '')}`
      : '';

    parsedUrl.pathname = `${basePath}${extraPath}` || '/';
    return parsedUrl.toString().replace(/\/$/, '');
  }
};
