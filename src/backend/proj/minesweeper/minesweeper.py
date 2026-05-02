from flask import Blueprint, request, jsonify
import uuid
import random
from collections import deque

minesweeper_bp = Blueprint('minesweeper', __name__)

# In-memory store of games: game_id -> Game instance
GAMES = {}


class Game:
    def __init__(self, rows, cols, mines):
        self.rows = rows
        self.cols = cols
        self.mines_total = mines
        self.mines = set()
        self.counts = [[0 for _ in range(cols)] for _ in range(rows)]
        # 0 = covered, 1 = revealed, 2 = flagged
        self.state = [[0 for _ in range(cols)] for _ in range(rows)]
        self.revealed_count = 0
        self.mines_placed = False
        self.status = 'ongoing'  # 'ongoing', 'won', 'lost'

    def in_bounds(self, r, c):
        return 0 <= r < self.rows and 0 <= c < self.cols

    def place_mines(self, first_click=None):
        # place mines avoiding first_click and its neighbors for first-click safety
        exclude = set()
        if first_click:
            fr, fc = first_click
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    rr, cc = fr + dr, fc + dc
                    if self.in_bounds(rr, cc):
                        exclude.add((rr, cc))

        all_cells = [(r, c) for r in range(self.rows) for c in range(self.cols) if (r, c) not in exclude]
        mines = set(random.sample(all_cells, min(self.mines_total, len(all_cells))))
        self.mines = mines
        # compute adjacent counts
        for (r, c) in mines:
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    nr, nc = r + dr, c + dc
                    if self.in_bounds(nr, nc):
                        self.counts[nr][nc] += 1

        self.mines_placed = True

    def toggle_flag(self, r, c):
        if not self.in_bounds(r, c) or self.status != 'ongoing':
            return
        if self.state[r][c] == 0:
            self.state[r][c] = 2
        elif self.state[r][c] == 2:
            self.state[r][c] = 0

    def reveal(self, r, c):
        if not self.in_bounds(r, c) or self.status != 'ongoing':
            return
        if not self.mines_placed:
            self.place_mines(first_click=(r, c))

        if self.state[r][c] == 1 or self.state[r][c] == 2:
            return

        if (r, c) in self.mines:
            # lost: reveal all mines
            for (mr, mc) in self.mines:
                self.state[mr][mc] = 1
            self.status = 'lost'
            return

        # flood fill for zeros
        q = deque()
        q.append((r, c))
        while q:
            cr, cc = q.popleft()
            if self.state[cr][cc] == 1:
                continue
            self.state[cr][cc] = 1
            self.revealed_count += 1
            if self.counts[cr][cc] == 0:
                for dr in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        nr, nc = cr + dr, cc + dc
                        if self.in_bounds(nr, nc) and self.state[nr][nc] == 0 and (nr, nc) not in self.mines:
                            q.append((nr, nc))

        # check win
        if self.revealed_count == self.rows * self.cols - len(self.mines):
            self.status = 'won'
            # reveal mines as flagged
            for (mr, mc) in self.mines:
                if self.state[mr][mc] != 1:
                    self.state[mr][mc] = 2

    def visible_board(self):
        # return a matrix of objects describing visible state
        out = []
        for r in range(self.rows):
            row = []
            for c in range(self.cols):
                cell = {'state': 'covered', 'value': None}
                s = self.state[r][c]
                if s == 2:
                    cell['state'] = 'flagged'
                elif s == 1:
                    cell['state'] = 'revealed'
                    if (r, c) in self.mines:
                        cell['value'] = 'mine'
                    else:
                        cell['value'] = self.counts[r][c]
                row.append(cell)
            out.append(row)
        return out


def make_new_game(level):
    if level == 'beginner':
        rows, cols, mines = 9, 9, 10
    elif level == 'intermediate':
        rows, cols, mines = 16, 16, 40
    elif level == 'expert':
        rows, cols, mines = 16, 30, 99
    else:
        # allow custom via level like "10x10:15"
        try:
            parts = level.split(':')
            dims = parts[0].split('x')
            rows, cols = int(dims[0]), int(dims[1])
            mines = int(parts[1]) if len(parts) > 1 else max(1, (rows * cols) // 6)
        except Exception:
            rows, cols, mines = 9, 9, 10

    g = Game(rows, cols, mines)
    gid = uuid.uuid4().hex
    GAMES[gid] = g
    return gid, g


@minesweeper_bp.route('/new', methods=['POST'])
def api_new():
    payload = request.get_json() or {}
    level = payload.get('level', 'beginner')
    gid, g = make_new_game(level)
    return jsonify({'game_id': gid, 'rows': g.rows, 'cols': g.cols, 'mines': g.mines_total, 'status': g.status})


@minesweeper_bp.route('/reveal', methods=['POST'])
def api_reveal():
    payload = request.get_json() or {}
    gid = payload.get('game_id')
    r = int(payload.get('r', -1))
    c = int(payload.get('c', -1))
    g = GAMES.get(gid)
    if g is None:
        return jsonify({'error': 'unknown game_id'}), 400
    g.reveal(r, c)
    return jsonify({'game_id': gid, 'board': g.visible_board(), 'status': g.status})


@minesweeper_bp.route('/flag', methods=['POST'])
def api_flag():
    payload = request.get_json() or {}
    gid = payload.get('game_id')
    r = int(payload.get('r', -1))
    c = int(payload.get('c', -1))
    g = GAMES.get(gid)
    if g is None:
        return jsonify({'error': 'unknown game_id'}), 400
    g.toggle_flag(r, c)
    return jsonify({'game_id': gid, 'board': g.visible_board(), 'status': g.status})


@minesweeper_bp.route('/state', methods=['GET'])
def api_state():
    gid = request.args.get('game_id')
    g = GAMES.get(gid)
    if g is None:
        return jsonify({'error': 'unknown game_id'}), 400
    return jsonify({'game_id': gid, 'board': g.visible_board(), 'status': g.status, 'rows': g.rows, 'cols': g.cols})
