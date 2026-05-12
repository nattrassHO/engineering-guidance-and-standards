import extractRequirements from '../../lib/filters/extractRequirements.js';
import isoDateOnly from '../../lib/filters/isoDateOnly.js';
import prefixWithRoot from '../../lib/filters/prefixWithRoot.js';

export default class {
  data() {
    return {
      eleventyExcludeFromCollections: true,
      pagination: {
        data: 'collections.getAllStandardsOrderedByID',
        size: 1,
        alias: 'standard'
      },
      permalink: data => `/api/standards/${data.standard.data.id}.json`
    };
  }

  render(data) {
    const standard = data.standard;

    return JSON.stringify({
      standard: {
        id: standard.data.id,
        title: standard.data.title,
        url: prefixWithRoot(standard.url, data.siteRoot),
        date: isoDateOnly(standard.data.date),
        tags: standard.data.tags,
        requirements: extractRequirements(standard.templateContent)
      }
    }, null, 2);
  }
}