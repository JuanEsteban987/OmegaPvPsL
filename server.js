const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Estado del juego
const gameState = {
  servers: [
    { id: 'server1', name: 'Dust2 - EU', map: 'dust2', players: 0, maxPlayers: 10 },
    { id: 'server2', name: 'Inferno - US', map: 'inferno', players: 0, maxPlayers: 10 },
    { id: 'server3', name: 'Mirage - ASIA', map: 'mirage', players: 0, maxPlayers: 10 }
  ],
  games: {}
};

class Game {
  constructor(serverId, mapName) {
    this.serverId = serverId;
    this.mapName = mapName;
    this.players = new Map();
    this.round = 0;
    this.roundTime = 115; // 1:55 minutos
    this.bombPlanted = false;
    this.bombPosition = null;
    this.bombTimer = null;
    this.defuseTimer = null;
    this.scores = { terrorists: 0, counterTerrorists: 0 };
    this.roundActive = false;
    this.freezeTime = 15;
    this.winner = null;
    this.bombs = [];
    this.bullets = [];
    this.grenades = [];
  }

  addPlayer(playerId, nickname, ws) {
    const team = this.getBalancedTeam();
    const spawn = this.getSpawnPoint(team);
    
    this.players.set(playerId, {
      id: playerId,
      nickname: nickname,
      ws: ws,
      team: team,
      x: spawn.x,
      y: spawn.y,
      angle: 0,
      health: 100,
      armor: 0,
      money: 800,
      weapons: [{ type: 'knife', ammo: -1 }, { type: team === 'terrorist' ? 'glock' : 'usp', ammo: 12 }],
      currentWeapon: 1,
      alive: true,
      kills: 0,
      deaths: 0,
      hasBomb: false
    });

    return team;
  }

  getBalancedTeam() {
    let terrorists = 0;
    let cts = 0;
    
    this.players.forEach(p => {
      if (p.team === 'terrorist') terrorists++;
      else cts++;
    });

    return terrorists <= cts ? 'terrorist' : 'counterTerrorist';
  }

  getSpawnPoint(team) {
    const spawns = {
      dust2: {
        terrorist: [
          { x: 100, y: 100 },
          { x: 120, y: 100 },
          { x: 140, y: 100 },
          { x: 100, y: 120 },
          { x: 120, y: 120 }
        ],
        counterTerrorist: [
          { x: 700, y: 500 },
          { x: 720, y: 500 },
          { x: 740, y: 500 },
          { x: 700, y: 520 },
          { x: 720, y: 520 }
        ]
      },
      inferno: {
        terrorist: [
          { x: 80, y: 80 },
          { x: 100, y: 80 },
          { x: 120, y: 80 }
        ],
        counterTerrorist: [
          { x: 720, y: 520 },
          { x: 740, y: 520 },
          { x: 760, y: 520 }
        ]
      },
      mirage: {
        terrorist: [
          { x: 90, y: 90 },
          { x: 110, y: 90 },
          { x: 130, y: 90 }
        ],
        counterTerrorist: [
          { x: 710, y: 510 },
          { x: 730, y: 510 },
          { x: 750, y: 510 }
        ]
      }
    };

    const mapSpawns = spawns[this.mapName] || spawns.dust2;
    const teamSpawns = mapSpawns[team];
    return teamSpawns[Math.floor(Math.random() * teamSpawns.length)];
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  startRound() {
    this.round++;
    this.roundActive = true;
    this.roundTime = 115;
    this.bombPlanted = false;
    this.bombPosition = null;
    this.bombs = [];
    this.bullets = [];
    this.grenades = [];

    // Dar la bomba a un terrorista aleatorio
    const terrorists = Array.from(this.players.values()).filter(p => p.team === 'terrorist' && p.alive);
    if (terrorists.length > 0) {
      const bomber = terrorists[Math.floor(Math.random() * terrorists.length)];
      bomber.hasBomb = true;
    }

    // Resetear jugadores
    this.players.forEach(player => {
      player.alive = true;
      player.health = 100;
      const spawn = this.getSpawnPoint(player.team);
      player.x = spawn.x;
      player.y = spawn.y;
    });

    this.broadcast({
      type: 'roundStart',
      round: this.round,
      freezeTime: this.freezeTime
    });

    // Freeze time
    setTimeout(() => {
      this.broadcast({ type: 'freezeTimeEnd' });
      this.startRoundTimer();
    }, this.freezeTime * 1000);
  }

  startRoundTimer() {
    const timer = setInterval(() => {
      this.roundTime--;
      
      if (this.roundTime <= 0 || this.checkRoundEnd()) {
        clearInterval(timer);
        this.endRound();
      }
    }, 1000);
  }

  plantBomb(playerId, x, y) {
    const player = this.players.get(playerId);
    if (!player || player.team !== 'terrorist' || !player.hasBomb || this.bombPlanted) {
      return false;
    }

    // Verificar si está en zona de plantación (zona A o B)
    const bombSites = this.getBombSites();
    let inSite = false;
    
    for (let site of bombSites) {
      if (x >= site.x && x <= site.x + site.width && 
          y >= site.y && y <= site.y + site.height) {
        inSite = true;
        break;
      }
    }

    if (!inSite) return false;

    this.bombPlanted = true;
    this.bombPosition = { x, y };
    player.hasBomb = false;
    
    this.bombs.push({
      x: x,
      y: y,
      timer: 45,
      planted: true
    });

    this.broadcast({
      type: 'bombPlanted',
      position: { x, y },
      planter: player.nickname
    });

    // Timer de la bomba
    this.bombTimer = setInterval(() => {
      if (this.bombs.length > 0) {
        this.bombs[0].timer--;
        
        if (this.bombs[0].timer <= 0) {
          clearInterval(this.bombTimer);
          this.bombExplode();
        }
      }
    }, 1000);

    return true;
  }

  defuseBomb(playerId) {
    const player = this.players.get(playerId);
    if (!player || player.team !== 'counterTerrorist' || !this.bombPlanted) {
      return false;
    }

    const distance = Math.sqrt(
      Math.pow(player.x - this.bombPosition.x, 2) + 
      Math.pow(player.y - this.bombPosition.y, 2)
    );

    if (distance > 50) return false;

    // Tiempo de desactivación: 10 segundos (5 con kit)
    const defuseTime = player.hasDefuseKit ? 5 : 10;
    
    this.broadcast({
      type: 'bombDefusing',
      defuser: player.nickname,
      time: defuseTime
    });

    this.defuseTimer = setTimeout(() => {
      if (this.bombPlanted) {
        this.bombDefused(playerId);
      }
    }, defuseTime * 1000);

    return true;
  }

  bombDefused(playerId) {
    const player = this.players.get(playerId);
    clearInterval(this.bombTimer);
    this.bombPlanted = false;
    this.bombs = [];
    
    this.broadcast({
      type: 'bombDefused',
      defuser: player.nickname
    });

    this.endRound('counterTerrorist');
  }

  bombExplode() {
    this.broadcast({ type: 'bombExploded' });
    this.endRound('terrorist');
  }

  getBombSites() {
    // Zonas de plantación según el mapa
    const sites = {
      dust2: [
        { name: 'A', x: 500, y: 100, width: 100, height: 100 },
        { name: 'B', x: 600, y: 400, width: 100, height: 100 }
      ],
      inferno: [
        { name: 'A', x: 450, y: 150, width: 100, height: 100 },
        { name: 'B', x: 550, y: 450, width: 100, height: 100 }
      ],
      mirage: [
        { name: 'A', x: 520, y: 120, width: 100, height: 100 },
        { name: 'B', x: 580, y: 420, width: 100, height: 100 }
      ]
    };

    return sites[this.mapName] || sites.dust2;
  }

  checkRoundEnd() {
    const aliveTerrorists = Array.from(this.players.values()).filter(
      p => p.team === 'terrorist' && p.alive
    ).length;
    
    const aliveCTs = Array.from(this.players.values()).filter(
      p => p.team === 'counterTerrorist' && p.alive
    ).length;

    if (aliveTerrorists === 0 && !this.bombPlanted) {
      this.endRound('counterTerrorist');
      return true;
    }

    if (aliveCTs === 0) {
      this.endRound('terrorist');
      return true;
    }

    return false;
  }

  endRound(winningTeam = null) {
    this.roundActive = false;

    if (!winningTeam) {
      winningTeam = 'counterTerrorist'; // CTs ganan si se acaba el tiempo
    }

    this.scores[winningTeam === 'terrorist' ? 'terrorists' : 'counterTerrorists']++;

    // Recompensas de dinero
    this.players.forEach(player => {
      if (player.team === winningTeam) {
        player.money += 3250;
      } else {
        player.money += 1400;
      }
      player.money = Math.min(player.money, 16000);
    });

    this.broadcast({
      type: 'roundEnd',
      winner: winningTeam,
      scores: this.scores
    });

    // Verificar victoria
    if (this.scores.terrorists >= 16 || this.scores.counterTerrorists >= 16) {
      this.endGame();
    } else {
      setTimeout(() => {
        this.startRound();
      }, 5000);
    }
  }

  endGame() {
    const winner = this.scores.terrorists > this.scores.counterTerrorists ? 
      'terrorist' : 'counterTerrorist';
    
    this.winner = winner;
    
    this.broadcast({
      type: 'gameEnd',
      winner: winner,
      finalScores: this.scores,
      mvp: this.getMVP()
    });
  }

  getMVP() {
    let mvp = null;
    let maxKills = 0;

    this.players.forEach(player => {
      if (player.kills > maxKills) {
        maxKills = player.kills;
        mvp = player;
      }
    });

    return mvp ? { nickname: mvp.nickname, kills: mvp.kills } : null;
  }

  updatePlayer(playerId, data) {
    const player = this.players.get(playerId);
    if (!player) return;

    if (data.x !== undefined) player.x = data.x;
    if (data.y !== undefined) player.y = data.y;
    if (data.angle !== undefined) player.angle = data.angle;
    if (data.currentWeapon !== undefined) player.currentWeapon = data.currentWeapon;
  }

  shoot(playerId, angle) {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;

    const weapon = player.weapons[player.currentWeapon];
    if (!weapon || weapon.ammo === 0) return;

    if (weapon.ammo > 0) {
      weapon.ammo--;
    }

    const bullet = {
      id: Date.now() + Math.random(),
      x: player.x,
      y: player.y,
      angle: angle,
      speed: 15,
      damage: this.getWeaponDamage(weapon.type),
      owner: playerId
    };

    this.bullets.push(bullet);

    this.broadcast({
      type: 'shoot',
      playerId: playerId,
      bullet: bullet
    });
  }

  throwGrenade(playerId, type, angle) {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;

    const grenade = {
      id: Date.now() + Math.random(),
      type: type,
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * 8,
      vy: Math.sin(angle) * 8,
      timer: type === 'smoke' ? 1.5 : 1.5,
      owner: playerId
    };

    this.grenades.push(grenade);

    this.broadcast({
      type: 'grenade',
      grenade: grenade
    });
  }

  getWeaponDamage(weaponType) {
    const damages = {
      knife: 65,
      glock: 26,
      usp: 35,
      deagle: 53,
      ak47: 36,
      m4a4: 33,
      awp: 115,
      mp5: 26,
      p90: 26
    };
    return damages[weaponType] || 20;
  }

  buyWeapon(playerId, weaponType) {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return false;

    const prices = {
      deagle: 700,
      ak47: 2700,
      m4a4: 3100,
      awp: 4750,
      mp5: 1250,
      p90: 2350,
      armor: 650,
      helmet: 350,
      defusekit: 400,
      hegrenade: 300,
      flashbang: 200,
      smoke: 300
    };

    const price = prices[weaponType];
    if (!price || player.money < price) return false;

    player.money -= price;

    if (weaponType === 'armor') {
      player.armor = 100;
    } else if (weaponType === 'helmet') {
      player.hasHelmet = true;
    } else if (weaponType === 'defusekit') {
      player.hasDefuseKit = true;
    } else if (['hegrenade', 'flashbang', 'smoke'].includes(weaponType)) {
      // Añadir granada al inventario
      const grenadeSlot = player.weapons.findIndex(w => !w);
      if (grenadeSlot === -1 && player.weapons.length < 5) {
        player.weapons.push({ type: weaponType, ammo: 1 });
      }
    } else {
      // Reemplazar arma secundaria o primaria
      const ammo = this.getWeaponAmmo(weaponType);
      if (['deagle'].includes(weaponType)) {
        player.weapons[1] = { type: weaponType, ammo: ammo };
      } else {
        if (player.weapons[2]) {
          player.weapons[2] = { type: weaponType, ammo: ammo };
        } else {
          player.weapons.push({ type: weaponType, ammo: ammo });
        }
      }
    }

    return true;
  }

  getWeaponAmmo(weaponType) {
    const ammos = {
      glock: 20,
      usp: 12,
      deagle: 7,
      ak47: 30,
      m4a4: 30,
      awp: 10,
      mp5: 30,
      p90: 50
    };
    return ammos[weaponType] || 30;
  }

  update() {
    // Actualizar balas
    this.bullets = this.bullets.filter(bullet => {
      bullet.x += Math.cos(bullet.angle) * bullet.speed;
      bullet.y += Math.sin(bullet.angle) * bullet.speed;

      // Verificar colisiones con jugadores
      for (let [pid, player] of this.players) {
        if (pid === bullet.owner || !player.alive) continue;

        const distance = Math.sqrt(
          Math.pow(player.x - bullet.x, 2) + 
          Math.pow(player.y - bullet.y, 2)
        );

        if (distance < 16) {
          player.health -= bullet.damage;
          
          if (player.health <= 0) {
            player.alive = false;
            player.deaths++;
            
            const shooter = this.players.get(bullet.owner);
            if (shooter) {
              shooter.kills++;
              shooter.money += 300;
            }

            this.broadcast({
              type: 'playerKilled',
              victim: player.nickname,
              killer: shooter ? shooter.nickname : 'Unknown'
            });

            this.checkRoundEnd();
          }

          return false;
        }
      }

      // Verificar límites del mapa
      return bullet.x > 0 && bullet.x < 800 && bullet.y > 0 && bullet.y < 600;
    });

    // Actualizar granadas
    this.grenades = this.grenades.filter(grenade => {
      grenade.x += grenade.vx;
      grenade.y += grenade.vy;
      grenade.vx *= 0.98;
      grenade.vy *= 0.98;
      grenade.timer -= 0.016;

      if (grenade.timer <= 0) {
        this.explodeGrenade(grenade);
        return false;
      }

      return true;
    });
  }

  explodeGrenade(grenade) {
    this.broadcast({
      type: 'grenadeExplode',
      grenade: grenade
    });

    if (grenade.type === 'hegrenade') {
      // Daño de HE grenade
      this.players.forEach(player => {
        if (!player.alive) return;
        
        const distance = Math.sqrt(
          Math.pow(player.x - grenade.x, 2) + 
          Math.pow(player.y - grenade.y, 2)
        );

        if (distance < 100) {
          const damage = Math.max(0, 100 - distance);
          player.health -= damage;
          
          if (player.health <= 0) {
            player.alive = false;
            player.deaths++;
            
            const thrower = this.players.get(grenade.owner);
            if (thrower) {
              thrower.kills++;
            }
          }
        }
      });
    }
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    this.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    });
  }

  getState() {
    return {
      round: this.round,
      roundTime: this.roundTime,
      scores: this.scores,
      bombPlanted: this.bombPlanted,
      bombPosition: this.bombPosition,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        nickname: p.nickname,
        team: p.team,
        x: p.x,
        y: p.y,
        angle: p.angle,
        health: p.health,
        armor: p.armor,
        alive: p.alive,
        kills: p.kills,
        deaths: p.deaths,
        hasBomb: p.hasBomb,
        currentWeapon: p.currentWeapon,
        weapons: p.weapons
      })),
      bombs: this.bombs,
      bullets: this.bullets,
      grenades: this.grenades
    };
  }
}

// Conexión WebSocket
wss.on('connection', (ws) => {
  let playerId = null;
  let currentGame = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'getServers':
          ws.send(JSON.stringify({
            type: 'serverList',
            servers: gameState.servers.map(s => ({
              ...s,
              players: gameState.games[s.id] ? gameState.games[s.id].players.size : 0
            }))
          }));
          break;

        case 'joinServer':
          playerId = Date.now() + '-' + Math.random();
          const server = gameState.servers.find(s => s.id === data.serverId);
          
          if (!server) {
            ws.send(JSON.stringify({ type: 'error', message: 'Server not found' }));
            break;
          }

          if (!gameState.games[data.serverId]) {
            gameState.games[data.serverId] = new Game(data.serverId, server.map);
          }

          currentGame = gameState.games[data.serverId];
          const team = currentGame.addPlayer(playerId, data.nickname, ws);

          ws.send(JSON.stringify({
            type: 'joined',
            playerId: playerId,
            team: team,
            map: server.map
          }));

          // Iniciar ronda si hay suficientes jugadores
          if (currentGame.players.size >= 2 && !currentGame.roundActive) {
            setTimeout(() => currentGame.startRound(), 3000);
          }
          break;

        case 'playerUpdate':
          if (currentGame) {
            currentGame.updatePlayer(playerId, data.data);
          }
          break;

        case 'shoot':
          if (currentGame) {
            currentGame.shoot(playerId, data.angle);
          }
          break;

        case 'buyWeapon':
          if (currentGame) {
            const success = currentGame.buyWeapon(playerId, data.weapon);
            ws.send(JSON.stringify({
              type: 'buyResult',
              success: success,
              weapon: data.weapon
            }));
          }
          break;

        case 'plantBomb':
          if (currentGame) {
            const planted = currentGame.plantBomb(playerId, data.x, data.y);
            ws.send(JSON.stringify({
              type: 'plantResult',
              success: planted
            }));
          }
          break;

        case 'defuseBomb':
          if (currentGame) {
            currentGame.defuseBomb(playerId);
          }
          break;

        case 'throwGrenade':
          if (currentGame) {
            currentGame.throwGrenade(playerId, data.grenadeType, data.angle);
          }
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentGame && playerId) {
      currentGame.removePlayer(playerId);
    }
  });
});

// Game loop
setInterval(() => {
  Object.values(gameState.games).forEach(game => {
    game.update();
    
    // Broadcast game state
    game.broadcast({
      type: 'gameState',
      state: game.getState()
    });
  });
}, 16); // 60 FPS

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
