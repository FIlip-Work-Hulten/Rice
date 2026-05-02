import sys
from importlib import import_module
import os
import sys

# Ensure repo src is importable
ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


def fail(msg):
    print('FAIL:', msg)
    sys.exit(1)


def main():
    mod = import_module('src.backend.app')
    app = mod.app
    app.config['TESTING'] = True
    client = app.test_client()

    # new game
    r = client.post('/api/minesweeper/new', json={'level': 'beginner'})
    if r.status_code != 200:
        fail('new game returned status ' + str(r.status_code))
    j = r.get_json()
    if 'game_id' not in j:
        fail('new game missing game_id')
    if j.get('rows') != 9 or j.get('cols') != 9:
        fail('unexpected dimensions: {}'.format(j))

    gid = j['game_id']
    # reveal
    rv = client.post('/api/minesweeper/reveal', json={'game_id': gid, 'r': 0, 'c': 0})
    if rv.status_code != 200:
        fail('reveal failed: ' + str(rv.status_code))
    jr = rv.get_json()
    if 'board' not in jr:
        fail('reveal response missing board')

    st = client.get('/api/minesweeper/state', query_string={'game_id': gid})
    if st.status_code != 200:
        fail('state failed: ' + str(st.status_code))
    js = st.get_json()
    if js.get('game_id') != gid:
        fail('state returned wrong game id')

    print('All backend tests passed')


if __name__ == '__main__':
    main()
