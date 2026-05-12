import isoDateOnly from '../../lib/filters/isoDateOnly.js';
import prefixWithRoot from '../../lib/filters/prefixWithRoot.js';

export default class {
  data() {
    return {
      eleventyExcludeFromCollections: true,
      pagination: {
        data: 'collections.getAllPatternsOrderedByTitle',
        size: 1,
        alias: 'pattern'
      },
      permalink: data => `/api/patterns/${data.pattern.fileSlug}.json`
    };
  }

  render(data) {
    const pattern = data.pattern;

    return JSON.stringify({
      pattern: {
        id: pattern.fileSlug,
        title: pattern.data.title,
        url: prefixWithRoot(pattern.url, data.siteRoot),
        date: isoDateOnly(pattern.data.date),
        tags: pattern.data.tags,
        requirements: []
      }
    }, null, 2);
  }
}