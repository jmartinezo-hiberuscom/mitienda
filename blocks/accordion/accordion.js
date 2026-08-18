/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 */


export default function decorate(block) {
  [...block.children].forEach((row) => {
    const children = [...row.children];
    // decorate accordion item label
    const label = children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    const subtitles = children.slice(1, -1);
    subtitles.forEach((sub) => {
      // decorate accordion item subtitle
      const title = document.createElement('p');
      title.className = 'accordion-item-subtitle';
      title.append(...sub.childNodes);
      summary.append(title);
    });
    const body = children[children.length - 1];
    body.className = 'accordion-item-body';
    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    row.replaceWith(details);
  });
}
