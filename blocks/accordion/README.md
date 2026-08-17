# Accordion Block

Recrea un acordeón reutilizable a partir del contenido del CMS.

## Descripción

El bloque toma cada fila de contenido y la convierte en un elemento `details`/`summary` de HTML nativo, decorando la etiqueta (`summary`) y el cuerpo (`details`) de cada elemento del acordeón.

## Estructura inicial del contenido

Cada fila del bloque espera dos columnas:

| Columna | Contenido |
| ------- | --------- |
| 1       | Etiqueta del elemento (se muestra siempre) |
| 2       | Cuerpo del elemento (visible al abrirse) |

## Decorate

Para cada fila del bloque, el script:

1. Lee el valor del `label` (columna 1) y lo envuelve en un elemento `summary.accordion-item-label`.
2. Añade el icono de chevron (`span.accordion-item-icon.icon.icon-chevron-down`) al `summary`.
3. Marca el cuerpo (columna 2) como `accordion-item-body`.
4. Envuelve ambos en un `details.accordion-item` y reemplaza la fila original.

```js
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);

    const span = document.createElement('span');
    span.className = 'accordion-item-icon icon icon-chevron-down';
    summary.append(span);
    decorateIcons(summary);

    const body = row.children[1];
    body.className = 'accordion-item-body';

    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    row.replaceWith(details);
  });
}
```

## Nueva funcionalidad: icono del acordeón

El icono que indica el estado del acordeón (anteriormente pintado mediante CSS con un pseudo-elemento `::after`) ahora se inyecta en el DOM como un elemento del propio contenido, siguiendo el patrón estándar de iconos del proyecto.

- El icono se inserta como `<span class="accordion-item-icon icon icon-chevron-down">` dentro del `summary`.
- Se decora con el helper `decorateIcons` de `scripts/aem.js`, que genera un `<img>` apuntando a `icons/chevron-down.svg` y lo añade como hijo del `span`.
- Esto permite sustituir el archivo `icons/chevron-down.svg` sin tocar el CSS, o estilizar el icono directamente desde el bloque.
