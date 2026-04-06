import * as Handlebars from 'handlebars';

export function registerStandardHelpers(hbs: typeof Handlebars): void {
  hbs.registerHelper('upper', (str: unknown) =>
    typeof str === 'string' ? str.toUpperCase() : str,
  );
  hbs.registerHelper('lower', (str: unknown) =>
    typeof str === 'string' ? str.toLowerCase() : str,
  );
  hbs.registerHelper('formatDate', (date: unknown) => {
    if (!date) return '';
    return new Date(date as string).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });
}
