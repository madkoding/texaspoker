# Texas Poker · Multiplayer

Juego de **Texas Hold'em** multijugador en tiempo real con sistema de diseño
basado en la guía visual del `index.html` original (verde felt, dorado, tipografías
*Playfair Display* + *Inter*).

**Stack:** React 18 + Vite + TypeScript + Tailwind CSS · Node.js + WebSockets (`ws`).

## Estructura

```
texaspoker/
├── client/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/     # Card, PlayerSeat, PokerTable, ActionPanel
│   │   ├── pages/          # NamePrompt, Lobby, GameRoom, HandGuide
│   │   ├── hooks/          # useSocket, useGameState
│   │   └── types/
│   └── tailwind.config.js
└── server/                 # Node + ws (sin frameworks)
    └── src/
        ├── engine/         # GameEngine, deck, evaluator (10 manos)
        ├── rooms/          # Room, RoomManager
        └── types/
```

## Setup

```bash
# 1. Instalar dependencias (raíz + server + client)
npm run install:all

# 2. Levantar todo (server en :3001, client en :5173 con proxy /ws)
npm run dev
```

Luego abre `http://localhost:5173` en dos navegadores/ventanas privadas para
jugar con varios jugadores. Comparte el código de sala de 5 caracteres con tu
contrincante.

### Comandos individuales

```bash
npm --prefix server run dev      # solo WebSocket server
npm --prefix client run dev      # solo Vite
npm --prefix client run build    # build de producción del cliente
```

## Cómo jugar

1. Elige tu nombre (se guarda en `localStorage`).
2. Crea una sala o únete con un código.
3. Comparte el código. Cuando haya **≥ 2 jugadores**, pulsa **"Repartir mano"**.
4. Cada jugador recibe 2 cartas privadas. Se reparten 5 cartas comunitarias
   en tres calles (flop 3, turn 1, river 1).
5. Acciones disponibles: **Retirarse, Pasar, Igualar, Subir/Apostar, All-in**.
6. Showdown automático al final o cuando todos se retiran menos uno.
7. Pulsa **"Siguiente mano"** para repartir de nuevo (el dealer avanza).

## Reglas implementadas

- Texas Hold'em clásico · hasta **9 jugadores** por mesa
- Blinds 5/10, 1000 fichas iniciales
- Apuestas: `fold`, `check`, `call`, `bet`, `raise`, `all-in`
- Side pots: simplificado (el bote se reparte al mejor hand al showdown;
  cuando sólo queda 1 jugador vivo se le entrega el bote)
- All-in automático si no tienes fichas para igualar
- Evaluación completa de las **10 combinaciones** (Escalera Real → Carta Alta)
  con kickers y desempate
- Reconexión automática con backoff exponencial

## Sistema de diseño

Reutiliza la paleta y tipografías del `index.html` original:

- **Verde felt:** `#0b5d3b` / `#073d26` (con gradiente radial)
- **Dorado:** `#d4af37` (acentos) / `#f1d26a` (claro)
- **Crema:** `#faf6ee` (fondo)
- **Rojo póker:** `#c0392b` (palos rojos y fold)
- **Tipografías:** *Playfair Display* (títulos/manos) + *Inter* (UI)
- **Cartas:** replicas 1:1 del estilo del original (esquinas, palo central,
  color rojo/negro, sombra `0 3px 6px rgba(0,0,0,.15)`)

La página **"Guía"** (botón 📖) replica exactamente el contenido del
`index.html` original, ahora dentro de la app React con Tailwind.

## Protocolo WebSocket

`wss://host/ws` — mensajes JSON:

**Cliente → Servidor**
- `list` — pedir salas activas
- `create { name }` — crear sala
- `join { roomId, name }` — unirse a sala
- `leave` — salir
- `start` — iniciar mano
- `next` — siguiente mano
- `action { action, amount? }` — fold/check/call/bet/raise/all-in

**Servidor → Cliente**
- `state { state, you }` — snapshot público + tus cartas privadas
- `rooms [...]` — lista de salas
- `system` / `error` — mensajes

## Producción

```bash
npm --prefix client run build
# servir client/dist con cualquier estático y ws server detrás de un proxy
```
