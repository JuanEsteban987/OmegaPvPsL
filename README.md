# Counter Strike 2D - Juego Multijugador

Un juego multijugador táctico inspirado en Counter Strike con vista panorámica 2D estilo RPG.

## 🎮 CARACTERÍSTICAS

### ✨ Características Principales
- **Multijugador en tiempo real** con WebSocket
- **2 Bandos**: Terroristas vs Anti-Terroristas
- **3 Mapas**: Dust2, Inferno, Mirage
- **Vista panorámica 2D estilo RPG** con cámara que sigue al jugador
- **Texturas 16x16** mejoradas (paredes, pisos, bombas)
- **Modelos de jugadores mejorados** con animaciones
- **Modelos de armas mejorados** visualmente

### 🔫 Sistema de Armas
- **Cuchillo**: Arma cuerpo a cuerpo
- **Pistolas**: Glock, USP, Desert Eagle
- **Rifles**: AK-47, M4A4, AWP (sniper)
- **Subfusiles**: MP5, P90
- **Granadas**: HE, Flashbang, Smoke

### 🛒 Tienda (Presiona B)
- Compra armas con el dinero ganado
- Equipo táctico: chaleco, casco, kit de desactivación
- Sistema de economía realista
- Precios balanceados según el arma

### 💣 Sistema de Bombas
- **Terroristas**: Plantan la bomba en zonas A o B
- **Anti-Terroristas**: Desactivan la bomba
- Timer de 45 segundos para la explosión
- Tiempo de desactivación: 10 segundos (5 con kit)
- Zonas de plantación claramente marcadas

### 🏆 Sistema de Puntuación
- 16 rondas para ganar
- Puntos por eliminaciones
- Dinero por ronda ganada/perdida
- MVP al final de la partida
- Estadísticas de kills/deaths

### 🎯 Mecánicas de Juego
- **Movimiento**: WASD o flechas
- **Disparar**: Click izquierdo
- **Plantar/Desactivar bomba**: E
- **Cambiar arma**: Teclas 1-5
- **Abrir tienda**: B
- **Minimapa** en tiempo real
- **HUD completo** con vida, armadura, munición, dinero
- **Killfeed** con las eliminaciones recientes

### 🗺️ Mapas
Cada mapa incluye:
- Zonas de spawn para cada equipo
- 2 sitios de bomba (A y B)
- Paredes y obstáculos estratégicos
- Diseño balanceado para combate táctico

### 📊 Características Multijugador
- **Selección de servidores** con información en tiempo real
- **Nicknames personalizados**
- Sistema de equipos balanceado automáticamente
- Sincronización en tiempo real de todos los jugadores
- Sistema de colisiones con paredes
- Balística de balas realista

## 📦 INSTALACIÓN

### Requisitos
- Node.js 14 o superior
- Navegador web moderno (Chrome, Firefox, Edge)

### Paso 1: Instalar dependencias del servidor
```bash
cd server
npm install
```

### Paso 2: Iniciar el servidor
```bash
npm start
```
El servidor se ejecutará en `http://localhost:3000`

### Paso 3: Abrir el cliente
Abre `client/index.html` en tu navegador web.

**IMPORTANTE**: Para jugar en multijugador, necesitas abrir el archivo en múltiples pestañas o navegadores.

## 🎮 CÓMO JUGAR

### Inicio
1. Ingresa tu nickname
2. Selecciona un servidor
3. Serás asignado automáticamente a un equipo

### Durante el Juego
- **Terroristas**: Tu objetivo es plantar y proteger la bomba
- **Anti-Terroristas**: Elimina a todos los terroristas o desactiva la bomba

### Controles
- **W, A, S, D** o **Flechas**: Movimiento
- **Mouse**: Apuntar
- **Click izquierdo**: Disparar
- **1-5**: Cambiar arma
- **B**: Abrir tienda (solo al inicio de la ronda)
- **E**: Plantar bomba (Terroristas) / Desactivar bomba (Anti-Terroristas)

### Estrategia
1. **Compra inteligente**: Administra tu dinero sabiamente
2. **Comunicación**: Trabaja en equipo
3. **Posicionamiento**: Usa las paredes como cobertura
4. **Economía**: Las rondas perdidas también dan dinero
5. **Tiempo**: Los Terroristas deben plantar antes de que termine el tiempo

## 🎨 CARACTERÍSTICAS VISUALES

### Texturas 16x16
- Paredes de ladrillos detalladas
- Pisos con baldosas
- Bomba C4 animada
- Zonas de bomba resaltadas

### Modelos de Jugadores
- Diferenciación por equipo (Rojo: T, Azul: CT)
- Modelo corporal con cabeza y arma
- Indicadores de vida encima de cada jugador
- Indicador de bomba para el portador

### HUD Completo
- Barras de vida y armadura
- Contador de munición
- Dinero disponible
- Scoreboard en tiempo real
- Minimapa táctico
- Display de armas equipadas
- Killfeed
- Notificaciones de eventos

## 🏅 SISTEMA DE VICTORIA

### Condiciones de Victoria (por ronda)
- **Terroristas ganan si**:
  - La bomba explota
  - Eliminan a todos los Anti-Terroristas
  
- **Anti-Terroristas ganan si**:
  - Desactivan la bomba
  - Eliminan a todos los Terroristas
  - Se acaba el tiempo sin bomba plantada

### Victoria Final
- Primer equipo en llegar a 16 rondas ganadas
- Se muestra MVP con más eliminaciones
- Scoreboard final

## 🔧 ARQUITECTURA TÉCNICA

### Servidor (Node.js + WebSocket)
- Autoridad del servidor para prevenir trampas
- Game loop a 60 FPS
- Sistema de física para balas y granadas
- Manejo de colisiones
- Sistema de rondas automatizado
- Gestión de economía

### Cliente (HTML5 + Canvas)
- Renderizado 2D optimizado
- Sistema de cámara que sigue al jugador
- Interpolación de movimiento suave
- Sistema de partículas para efectos
- UI responsiva

## 🎯 PRÓXIMAS CARACTERÍSTICAS

- [ ] Más mapas
- [ ] Más armas
- [ ] Sistema de rankings
- [ ] Matchmaking automático
- [ ] Chat de texto
- [ ] Replay de partidas
- [ ] Estadísticas detalladas
- [ ] Customización de personajes
- [ ] Modos de juego adicionales

## 📝 NOTAS

- El juego está optimizado para 2-10 jugadores por servidor
- La latencia puede afectar la jugabilidad
- Se recomienda una conexión estable
- El servidor debe estar ejecutándose para jugar

## 🎮 ¡DISFRUTA EL JUEGO!

Counter Strike 2D es un proyecto de demostración de las capacidades de desarrollo de juegos multijugador con tecnologías web modernas.

**¡Buena suerte y diviértete!** 🎯
