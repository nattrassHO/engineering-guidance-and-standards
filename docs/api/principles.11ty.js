import isoDateOnly from '../../lib/filters/isoDateOnly.js';
import prefixWithRoot from '../../lib/filters/prefixWithRoot.js';

export default class {
  data() {
    return {
      eleventyExcludeFromCollections: true,
      pagination: {
        data: 'collections.getAllPrinciplesOrderedByTitle',
        size: 1,
        alias: 'principle'
      },
      permalink: data => `/api/principles/${data.principle.fileSlug}.json`
    };
  }

  render(data) {
    const principle = data.principle;

    return JSON.stringify({
      principle: {
        id: principle.fileSlug,
        title: principle.data.title,
        url: prefixWithRoot(principle.url, data.siteRoot),
        date: isoDateOnly(principle.data.date),
        tags: principle.data.tags,
        requirements: []
      }
    }, null, 2);
  }
}