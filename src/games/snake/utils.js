export const COLS = 40;
export const ROWS = 20;
/**
 * Estado inicial de la serpiente.
 * Devuelve un objeto con la posición inicial del cuerpo y la dirección.
 */
export function getSnakeInitialState() {
  return {
    snake: [
      { x: 20, y: 10 },
      { x: 19, y: 10 },
      { x: 18, y: 10 },
    ],
    direction: { x: 1, y: 0 }, // hacia la derecha
    nextDir: { x: 1, y: 0 },
  };
}
/**
 * Simula un tick de movimiento sin lógica de comida ni colisión.
 * Devuelve un nuevo estado con la serpiente desplazada una celda en la dirección actual.
 */
export function moveSnake(state) {
  const { snake, direction, nextDir } = state;
  const dir = nextDir || direction;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const newSnake = [head, ...snake];
  // Se elimina la cola (simulando movimiento sin comida)
  newSnake.pop();
  return { ...state, snake: newSnake, direction: dir, nextDir: dir };
}
/**
 * Verifica colisión contra bordes o contra sí misma.
 * Devuelve `true` si la cabeza está fuera del tablero o se superpone a otro segmento.
 */
export function checkCollision(state) {
  const { snake } = state;
  const head = snake[0];
  // choque con los límites
  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
    return true;
  }
  // choque consigo misma (excluyendo la cabeza)
  return snake.slice(1).some((s) => s.x === head.x && s.y === head.y);
}
