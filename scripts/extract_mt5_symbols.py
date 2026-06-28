import MetaTrader5 as mt5
import json
import sys

mt5.initialize()
symbols = mt5.symbols_get()

data = []
for s in symbols:
    path_parts = s.path.split('\\')
    category = path_parts[0] if path_parts else 'Other'
    data.append({
        'ticker': s.name,
        'description': s.description,
        'category': category,
        'path': s.path,
    })

data.sort(key=lambda x: (x['category'], x['ticker']))

print(f'Total: {len(data)}', file=sys.stderr)
cats = sorted(set(d['category'] for d in data))
for c in cats:
    count = sum(1 for d in data if d['category'] == c)
    print(f'  {c}: {count}', file=sys.stderr)

# Write JSON
with open('public/mt5-symbols.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)

print('Done', file=sys.stderr)
mt5.shutdown()
