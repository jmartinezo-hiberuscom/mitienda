# Accordion Block

Recrea un acordeón reutilizable a partir del contenido del CMS.

## Descripción

El bloque toma cada fila de contenido y la convierte en un elemento `details`/`summary` de HTML nativo, decorando la etiqueta (`summary`) y el cuerpo (`details`) de cada elemento del acordeón.

## Estructura inicial del contenido

Cada fila del bloque equivale a un elemento del acordeón. Admite **2 o 3 columnas**:

| Columna | Contenido | Obligatoria |
| ------- | --------- | ----------- |
| 1       | Etiqueta del elemento (se muestra siempre) | Sí |
| 2       | Subtítulo (`subtitle`, se muestra siempre bajo la etiqueta) | No |
| 3       | Cuerpo del elemento (visible al abrirse) | Sí |

- Con **3 columnas**: la 2ª es el subtítulo y la 3ª el cuerpo.
- Con **2 columnas**: no hay subtítulo y la 2ª es el cuerpo.

## Decorate

Para cada fila del bloque, el script:

1. Lee el valor del `label` (primera columna) y lo envuelve en un elemento `summary.accordion-item-label`.
2. Trata **todas las columnas intermedias** (entre el label y la última) como subtítulos (`subtitle`), envolviendo cada una en un `<p class="accordion-item-subtitle">` dentro del `summary`. Al usar `slice(1, -1)`, si solo hay 2 columnas el array queda vacío y no se añade ningún subtítulo.
3. Marca el cuerpo (**siempre la última columna**) como `accordion-item-body`.
4. Envuelve todo en un `details.accordion-item` y reemplaza la fila original.

```js
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const children = [...row.children];
    const label = children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);

    const subtitles = children.slice(1, -1);
    subtitles.forEach((sub) => {
      const title = document.createElement('p');
      title.className = 'accordion-item-subtitle';
      title.append(...sub.childNodes);
      summary.append(title);
    });

    const body = children[children.length - 1];
    body.className = 'accordion-item-body';

    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    row.replaceWith(details);
  });
}
```

> **Nota:** el cuerpo se identifica siempre por ser la **última columna**, no por contenido. Dado que el campo `subtitle` no se distingue por el `name` del modelo en el DOM (todo llega como `<p>`), la semántica se define por la posición de las columnas. La solución es tolerante a 2 o 3 columnas.
