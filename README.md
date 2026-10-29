# GV Review · English X Level 5

Página estática para estudiar el examen final **English X: Level 5 – Grammar & Vocabulary Review**: gramática (past & present habits, future tenses), vocabulario de salud, writing y speaking.

HTML + CSS + JavaScript sin frameworks, sin backend y sin build. El progreso se guarda en `localStorage` (solo en tu navegador).

## Secciones

| Sección | Qué tiene |
| --- | --- |
| Inicio | Qué evalúa el examen, progreso por tema y accesos rápidos |
| Grammar | Teoría (would, used to, be used to, usually, futuros), ejercicios del PPT y nuevos con corrección inmediata, y la lista "Verificar con el profesor" |
| Vocab | Flashcards, Vocabulary Building 1 y 2, opción múltiple, emparejar y lista de palabras |
| Writing | Estructura del ensayo, conectores, temas, ensayo modelo y un editor con temporizador de 60 min |
| Speaking | Frases útiles, preguntas de discusión y un temporizador de 10 o 15 min |
| Simulacro | 20 preguntas de gramática y 10 de vocabulario al azar, con puntaje y errores |

Etiquetas: **PPT · diap. N** = contenido original del PPT · **Nuevo** = creado para la página · **Verificar** = confirmar con el profesor.

## Editar el contenido

Todo el contenido de estudio está en `data/`. No hace falta tocar el código:

- `data/grammar.json`: teoría (`topics`), tabla comparativa, notas para el profesor y ejercicios (`exercises`).
  En cada frase, `___` marca el espacio y `answers` lista las respuestas válidas (la primera es la principal). Agrega `"verify": true` para que aparezca en "Verificar con el profesor".
- `data/vocab.json`: palabras (`words`) y textos con banco de palabras (`readings`, con espacios `[1]`, `[2]`…).
- `data/writing.json`: estructura, conectores, frases de opinión, temas, ensayo modelo y checklist.
- `data/speaking.json`: frases y preguntas de discusión.

`"source": "ppt"` o `"nuevo"` define la etiqueta. La corrección ignora mayúsculas y espacios extra, y acepta tanto contracciones como formas completas (I'm = I am, isn't = is not).

## Ver la página en tu computador

La página carga los JSON con `fetch`, así que **no funciona abriendo `index.html` con doble clic**. Hay que servirla desde un servidor local, desde la carpeta del proyecto:

```bash
npx http-server -p 8080 -c-1
```

Luego abre http://localhost:8080.

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub (rama `main`).
2. En el repositorio ve a **Settings → Pages**.
3. En *Build and deployment* elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`, y luego **Save**.
4. En uno o dos minutos la página estará en `https://<tu-usuario>.github.io/Ingles/`.

## Estructura

```
index.html
css/styles.css
js/app.js         router, inicio, gramática, tema claro/oscuro
js/exercises.js   motor de ejercicios de completar
js/vocab.js       flashcards, textos, quiz, emparejar
js/writing.js     guía y editor con temporizador
js/speaking.js    frases, preguntas y temporizador
js/exam.js        simulacro
js/ui.js          pestañas y temporizador
js/util.js        utilidades y normalización de respuestas
js/store.js       progreso en localStorage
data/*.json       contenido de estudio
```
