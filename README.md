# MEC — Multiversal Echoes Clash 🥊⚡

Juego de peleas arcade 2D estilo clásico de tag/s人次 (MVC-style) — **100% original**:
motor, roster y arte generados por código. Mecánicas inspiradas en los clásicos del género
(fighter, hyper meter,>window(cancel), air-chain, rondas al mejor de 3) — sin assets ni
personajes con copyright.

## gracioso jugarlo YA (sin instalar nada)

1. Tras el push, GitHub Pages despliega: `https://ivanrazieily03.github.io/mec/`
2. Abre la URL en cualquier navegador (teléfono o PC)
3. Botón **▶ INICIAR TORNEO**

En el teléfono: D-pad + A/B/C/HC (⚡ hyper —requests barra llena)

## Roster v0.1 (4 placeholders editables)

| Fighter | Estilo | Especial |
|---|---|---|
| **VOLT** | rushdown | Rayo Volt (proyectil) + Mega Chispa |
| **BRUTO** | grappler | Agarre Brutal + Titanzuelo |
| **SIREN** | zoner | Eco Musical + Sinfonía Roja |
| **DORADO** | counter | Contra Dorada + Combo Dorado |

### 🔧 Poner TUS PROPIOS PERSONAJES
Todo el roster vive en `js/fighters.json` — **no toques código**:

```json
{ "id": "tu-heroe", "name": "TU HÉROE", 
  "colors": { "skin": "#hex", "suit": "#hex", "accent": "#hex" },
  "health": 110, "speed": 3.2, "style": "rushdown",
  "moves": { "a": {…}, "b": {…}, "c": {…}, "hyper": {…} } }
```
Push → deploy automático → tu héroe aparece ya seleccionable en pantalla.

## Roadmap

- **v0.1** ✅ 1v1 + CPU + rondas + hypers + táctil móvil
- **v0.2** tag-team 2v2 (estilo MvC: swap + assist) ← siguiente fase
- v0.3 sobreplan de vueltas individuales y supers cinemáticas via.Animaciones más ricas
- v0.4 apk wrapper (Android) reutilizando el pipeline AutoMirror

## Legal

Mecánicas = conceptos no protegibles; todo el código, arte y nombres son originales de este proyecto.
La referencia de mecánicas es un juego propio construido observa los clásicos, NO usa assets de terceros ni la imagen de ROM encontrada en descargas.
