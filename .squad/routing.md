# Routing Rules

## Domain Routing

| Domain / Signal | Route To | Notes |
|----------------|----------|-------|
| Architecture, game loop, state sync, tech decisions | Flynn | Lead reviews all major design choices |
| HTML5 Canvas, rendering, pixel art, sprites, animations | Quorra | Game Dev owns all client-side game code |
| Game mechanics, paddle movement, puck physics, scoring | Quorra | Core gameplay logic |
| UI screens, menus, lobby, game modes | Quorra | All player-facing UI |
| Node.js server, Express/Fastify setup | Rinzler | Backend owns all server code |
| WebSocket connections, real-time messaging | Rinzler | Multiplayer networking |
| Matchmaking, room management, invite links | Rinzler | Session/lobby management |
| AI opponent logic | Quorra + Flynn | Quorra implements, Flynn reviews |
| Tests, QA, edge cases, performance | Ram | All testing and quality |
| Multiplayer sync testing, latency | Ram + Rinzler | Ram tests, Rinzler fixes |
| Azure deployment, infrastructure, IaC | Clu | DevOps owns all infra and CI/CD |
| GitHub Actions, CI/CD pipelines | Clu | Deployment automation |
| Environment config, secrets, scaling | Clu | Production configuration |
| Docs, logs, decisions | Scribe | Silent — never user-facing |
| Work queue, backlog, monitoring | Ralph | Automated work tracking |

## Review Gates

| Artifact | Reviewer | Gate |
|----------|----------|------|
| Architecture decisions | Flynn | Must approve before implementation |
| Game mechanics changes | Flynn | Reviews gameplay impact |
| API/protocol changes | Flynn | Reviews multiplayer protocol |
| All code | Ram | Tests must pass |
